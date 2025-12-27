import {
    Connection,
    PublicKey,
    Keypair,
    LAMPORTS_PER_SOL,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction
} from "@solana/web3.js";

import {
    getOrCreateAssociatedTokenAccount,
    createSyncNativeInstruction,
    getMint,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import { loadKeypairFromFile } from "./keypair-utils.js";
import { swapToken } from "./jupiter-swap.js";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import BN from "bn.js";
import { Constants } from "./constants.js";

async function runBuyback() {
    try {
        const connection = new Connection(Constants.kHeliusRPCEndpoint, "confirmed");
        const buybackKeypair = await loadKeypairFromFile(Constants.kBuybackWalletKeyFile);

        // Initialize CpAmm SDK
        const cpAmm = new CpAmm(connection);

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
        console.log(`Using ${halfLamports / LAMPORTS_PER_SOL} SOL to buy TRT and ${halfLamports / LAMPORTS_PER_SOL} SOL for WSOL liquidity.`);

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

        const trtBalanceInfo = await connection.getTokenAccountBalance(new PublicKey(Constants.kBuybackTokenAccount), "confirmed");
        const trtAmount = new BN(trtBalanceInfo.value.amount);
        if (trtAmount.isZero()) {
            console.error("TRT balance after swap is zero, aborting.");
            return;
        }

        console.log(`TRT balance: ${trtBalanceInfo.value.uiAmount}`);

        // Wrap the other half of SOL into WSOL
        const wsolTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            buybackKeypair,
            new PublicKey(Constants.kWSOLMint),
            buybackKeypair.publicKey,
            true,
            "finalized",
            { commitment: "finalized" }
        );

        const wsolLamports = halfLamports;
        if (wsolLamports <= 0) {
            console.error("Insufficient SOL remaining for WSOL wrap and fees");
            return;
        }

        console.log(`Wrapping ${wsolLamports / LAMPORTS_PER_SOL} SOL into WSOL...`);

        // Transfer SOL into the WSOL account and sync
        const transferIx = SystemProgram.transfer({
            fromPubkey: buybackKeypair.publicKey,
            toPubkey: wsolTokenAccount.address,
            lamports: wsolLamports,
        });
        
        const syncIx = createSyncNativeInstruction(wsolTokenAccount.address);
        const transaction = new Transaction().add(transferIx, syncIx);
        const wrapSig = await sendAndConfirmTransaction(connection, transaction, [buybackKeypair]);
        
        console.log(`WSOL wrapped: ${wrapSig}`);

        // Verify WSOL balance
        const wsolBalance = await connection.getTokenAccountBalance(wsolTokenAccount.address, "confirmed");
        console.log(`WSOL balance: ${wsolBalance.value.uiAmount}`);

        // Get pool state
        const poolAddress = new PublicKey(Constants.kMeteoraMainTRTWSOLDAMMPool);
        const poolState = await cpAmm.fetchPoolState(poolAddress);

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
        console.log(`WSOL needed: ${depositQuote.outputAmount.toNumber() / LAMPORTS_PER_SOL} SOL`);

        // Check if we have enough WSOL
        if (depositQuote.outputAmount.gt(new BN(wsolLamports))) {
            console.error(`Not enough WSOL. Need ${depositQuote.outputAmount.toNumber() / LAMPORTS_PER_SOL}, have ${wsolLamports / LAMPORTS_PER_SOL}`);
            return;
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