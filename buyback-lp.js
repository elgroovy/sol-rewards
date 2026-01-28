import {
    Connection,
    PublicKey,
    Keypair,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction
} from "@solana/web3.js";

import {
    getMint,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import { loadKeypairFromFile } from "./keypair-utils.js";
import { swapToken } from "./jupiter-swap.js";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import BN from "bn.js";
import { Constants } from "./constants.js";
import { Config } from './config.js';
import fetch from 'node-fetch';

// Set to true to simulate buyback (sends fake notification)
const SIMULATION_MODE = false;

async function notifyTelegramBot(notificationPayload)
{
    try {
        const response = await fetch(Config.backendUrl + "/rewards/notify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": Config.adminApiKey
            },
            body: JSON.stringify(notificationPayload)
        });

        if (!response.ok) {
            console.error(`Failed to send notification. Status: ${response.status}, Message: ${await response.text()}`);
        } else {
            console.log("Notification sent successfully.");
        }
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

async function sendBuybackNotification(solUsed, trtBought, trtInjected, solPaired, txSignature)
{
    const solscanUrl = `https://solscan.io/tx/${txSignature}`;
    const message = `✅ *Status: Complete*\n\n⚡ Buyback: ${solUsed.toFixed(4)} SOL → ${trtBought.toFixed(2)} TRT\n🔒 LP Added: ${trtInjected.toFixed(2)} TRT + ${solPaired.toFixed(4)} SOL\n\n[Transaction](${solscanUrl})`;

    await notifyTelegramBot({
        messageType: "simple",
        messageText: message,
        mediaUrl: 'http://ipfs.io/ipfs/bafkreieycmc4qxey2rdjsrrz6siah2j7rzpnlb5cxhy32zcwubtgigrnzq',
        isAnimated: true
    });
}

async function runBuyback() {
    try {
        // Simulation mode - just send a mock notification
        if (SIMULATION_MODE) {
            console.log("🔸 SIMULATION MODE - Sending mock notification 🔸");
            await sendBuybackNotification(0.5000, 12345.67, 12345.67, 0.4500, "SIMULATED_TX_" + Date.now());
            return;
        }

        const connection = new Connection(Config.heliusMainnetUrl, "confirmed");
        const buybackKeypair = await loadKeypairFromFile(Config.buybackKeyFile);

        // Check SOL balance
        const balanceLamports = await connection.getBalance(buybackKeypair.publicKey);
        const reserveLamports = Constants.kBuybackSolToReserve * LAMPORTS_PER_SOL;
        if (balanceLamports <= reserveLamports) {
            console.log("Buyback wallet has insufficient SOL (including reserve). Skipping...");
            return;
        }

        // Compute amount to use for buyback (half of usable balance)
        const usableLamports = balanceLamports - reserveLamports;
        const halfLamports = Math.floor(usableLamports / 2);

        console.log(`Buyback wallet balance: ${balanceLamports / LAMPORTS_PER_SOL} SOL`);

        if (halfLamports < LAMPORTS_PER_SOL * 0.01)
        {
            console.log("Insufficient SOL for buyback. Skipping...");
            return;
        }

        console.log(`Using ${halfLamports / LAMPORTS_PER_SOL} SOL to buy TRT`);
        
        // Swap half SOL to TRT
        const swapResult = await swapToken(
            connection,
            buybackKeypair,
            Constants.kWSOLMint,
            halfLamports,
            Constants.kTokenMintPubkey,
            Constants.kBuybackWalletPubkey
        );

        if (!swapResult.success) {
            console.error("Swap failed, aborting buyback.");
            return;
        }

        // Store SOL used for buyback
        const solUsedForBuyback = halfLamports / LAMPORTS_PER_SOL;

        const trtBalanceInfo = await connection.getTokenAccountBalance(new PublicKey(Constants.kBuybackTokenAccount), "confirmed");
        const trtAmount = new BN(trtBalanceInfo.value.amount);
        if (trtAmount.isZero()) {
            console.error("TRT balance after swap is zero, aborting.");
            return;
        }

        // Store TRT bought
        const trtBought = trtBalanceInfo.value.uiAmount;

        console.log(`TRT balance: ${trtBought}`);

        // Get pool state
        const cpAmm = new CpAmm(connection); // initialize CpAmm SDK
        const poolAddress = new PublicKey(Constants.kMeteoraMainTRTWSOLDAMMPool);
        const poolState = await cpAmm.fetchPoolState(poolAddress);

        // Determine token order in the pool
        const wsolMint = new PublicKey(Constants.kWSOLMint);
        const isWsolTokenA = poolState.tokenAMint.equals(wsolMint);

        // Get Token2022 info for TRT
        let tokenAInfo = null;
        if (!isWsolTokenA) { // TRT is token A
            const trtMintInfo = await getMint(connection, poolState.tokenAMint, "confirmed", TOKEN_2022_PROGRAM_ID);
            const epochInfo = await connection.getEpochInfo();
            tokenAInfo = {
                mint: trtMintInfo,
                currentEpoch: epochInfo.epoch,
            };
        }

        // Get deposit quote - use TRT as input since we want to deposit all of it
        const depositQuote = await cpAmm.getDepositQuote({
            inAmount: trtAmount, // Deposit all TRT
            isTokenA: !isWsolTokenA, // TRT is token B if WSOL is token A
            minSqrtPrice: poolState.sqrtMinPrice,
            maxSqrtPrice: poolState.sqrtMaxPrice,
            sqrtPrice: poolState.sqrtPrice,
            inputTokenInfo: tokenAInfo,
        });

        console.log(`Liquidity delta: ${depositQuote.liquidityDelta.toString()}`);
        console.log(`Output amount needed: ${depositQuote.outputAmount.toString()}`);
        console.log(`SOL needed: ${depositQuote.outputAmount.toNumber() / LAMPORTS_PER_SOL} SOL`);

        // Store SOL paired for liquidity
        const solPairedForLiquidity = depositQuote.outputAmount.toNumber() / LAMPORTS_PER_SOL;

        // Check if we have enough SOL to cover liquidity + fees
        const solForLiquidity = halfLamports; // the second half reserved for liquidity
        if (depositQuote.outputAmount.gte(new BN(solForLiquidity))) {
            console.error(
                `Not enough SOL for liquidity. Need ${depositQuote.outputAmount.toNumber() / LAMPORTS_PER_SOL} SOL, have ${solForLiquidity / LAMPORTS_PER_SOL}`
            );
            return;
        }

        // Get all positions for this user in this pool
        const userPositions = await cpAmm.getUserPositionByPool(poolAddress, buybackKeypair.publicKey);
        
        let position;
        let positionNftAccount;

        if (userPositions.length > 0) {
            // Use the first existing position
            position = userPositions[0].position;
            positionNftAccount = userPositions[0].positionNftAccount;
            console.log(`Using existing position: ${position.toBase58()}`);
        } else {
            // Create a new position first
            console.log("No existing position found, creating new position...");
            
            // Generate new position NFT mint keypair
            const positionNftMint = Keypair.generate();
            
            const createPositionTx = await cpAmm.createPosition({
                owner: buybackKeypair.publicKey,
                payer: buybackKeypair.publicKey,
                pool: poolAddress,
                positionNft: positionNftMint.publicKey,
            });

            const createPosSig = await sendAndConfirmTransaction(connection, createPositionTx, [buybackKeypair, positionNftMint]);
            console.log(`Position created: ${createPosSig}`);

            // Derive position address
            const userPositions = await cpAmm.getUserPositionByPool(poolAddress, buybackKeypair.publicKey);
            if (userPositions.length > 0) {
                position = userPositions[0].position;
                positionNftAccount = userPositions[0].positionNftAccount;
            } else {
                throw new Error("Position creation apparently failed");
            }
        }

        // Set max amounts based on the quote
        let maxAmountTokenA;
        let maxAmountTokenB;

        const trtIsTokenA = !isWsolTokenA;

        if (trtIsTokenA) {
            // TRT = token A
            maxAmountTokenA = trtAmount;
            maxAmountTokenB = depositQuote.outputAmount; // WSOL lamports
        } else {
            // TRT = token B
            maxAmountTokenA = depositQuote.outputAmount; // WSOL lamports
            maxAmountTokenB = trtAmount;
        }

        const TRANSFER_FEE_BPS = 1000; // 10%
        const SLIPPAGE_BPS = 100;     // 1%

        const feeMultiplierNumerator = new BN(10_000);
        const feeMultiplierDenominator = new BN(10_000 - TRANSFER_FEE_BPS);

        const thresholdA = trtIsTokenA
            ? maxAmountTokenA
                .mul(feeMultiplierNumerator)
                .div(feeMultiplierDenominator)
                .muln(10_000 + SLIPPAGE_BPS)
                .divn(10_000)
            : maxAmountTokenA;

        const thresholdB = !trtIsTokenA
            ? maxAmountTokenB
                .mul(feeMultiplierNumerator)
                .div(feeMultiplierDenominator)
                .muln(10_000 + SLIPPAGE_BPS)
                .divn(10_000)
            : maxAmountTokenB;

        const tokenAProgram = poolState.tokenAMint.equals(new PublicKey(Constants.kTokenMintPubkey))
            ? TOKEN_2022_PROGRAM_ID
            : TOKEN_PROGRAM_ID;

        const tokenBProgram = poolState.tokenBMint.equals(new PublicKey(Constants.kTokenMintPubkey))
            ? TOKEN_2022_PROGRAM_ID
            : TOKEN_PROGRAM_ID;

        // Add liquidity with the quote
        const addLiquidityTx = await cpAmm.addLiquidity({
            owner: buybackKeypair.publicKey,
            pool: poolAddress,
            position: position,
            positionNftAccount: positionNftAccount,
            liquidityDelta: depositQuote.liquidityDelta,
            maxAmountTokenA: maxAmountTokenA,
            maxAmountTokenB: maxAmountTokenB,
            tokenAAmountThreshold: thresholdA,
            tokenBAmountThreshold: thresholdB,
            tokenAMint: poolState.tokenAMint,
            tokenBMint: poolState.tokenBMint,
            tokenAVault: poolState.tokenAVault,
            tokenBVault: poolState.tokenBVault,
            tokenAProgram,
            tokenBProgram,
        });

        // Sign and send transaction
        const addLiqSig = await sendAndConfirmTransaction(connection, addLiquidityTx, [buybackKeypair]);

        console.log("✅ Liquidity added to Meteora DAMM v2 pool:", addLiqSig);

        // Send Telegram notification
        await sendBuybackNotification(solUsedForBuyback, trtBought, trtBought, solPairedForLiquidity, addLiqSig);

    } catch (err) {
        console.error("Error in buyback process:", err);
    }
}

// Initial run
runBuyback().catch(console.error);

// Run every 30 minutes
setInterval(() => {
    runBuyback().catch(console.error);
}, 30 * 60 * 1000);

// Keep the process alive
process.stdin.resume();