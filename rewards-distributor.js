import {
    Connection,
    PublicKey,
    clusterApiUrl,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL
} from "@solana/web3.js";

import {
    getOrCreateAssociatedTokenAccount,
    getAssociatedTokenAddressSync,
    getMint,
    unpackAccount,
    burnChecked,
    createTransferCheckedInstruction,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";

import { loadKeypairFromFile } from "./keypair-utils.js";
import { swapToken } from './jupiter-swap.js';
import { Constants } from './constants.js';
import { Config } from './config.js';
import { collectFees } from './fee-collector.js';
import fetch from 'node-fetch';


let ownerKeypair = null;
let isRunning = false; // flag to track if reward distribution is running


async function getRewardTokenBalance(connection) {
    // Determine the token program ID for the reward token mint
    const mintAccountInfo = await connection.getAccountInfo(new PublicKey(Constants.kRewardTokenMintPubkey));
    if (!mintAccountInfo) {
        console.error("Failed to fetch mint account info for the reward token.");
        return;
    }

    const tokenProgramId = mintAccountInfo.owner;

    // Compute the associated token account for the reward token mint
    const rewardTokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(Constants.kRewardTokenMintPubkey),
        ownerKeypair.publicKey,
        true, // allow owner to be off-curve
        tokenProgramId
    );

    const info = await connection.getTokenAccountBalance(rewardTokenAccount);
    if (info.value.uiAmount == null) {
        console.error("No reward token balance found.");
        return;
    }

    return {address: rewardTokenAccount, programId : tokenProgramId, balance: info.value.amount, decimals: info.value.decimals};
}

async function distributeToHolders(connection, totalLamportsToSend) {
    console.log(`Got ${totalLamportsToSend / LAMPORTS_PER_SOL} SOL to distribute to holders...`);

    // Retrieve all Token Accounts for the Mint Account
    const allAccounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
        commitment: "confirmed",
        filters: [
            {
                memcmp: {
                    offset: 0,
                    bytes: Constants.kTokenMintPubkey,
                },
            },
        ],
    });
    
    // Exclude Fee, Treasury, and Burn wallets from the list of holders
    const excludedWallets = new Set([
        /*Constants.kTreasuryWalletPubkey,*/
        ownerKeypair.publicKey.toBase58(),
        Constants.kBurnWalletPubkey,
        Constants.kRaydiumVaultAuthority2, // Raydium pool
        Constants.kMeteoraTRTWSOLPool, // Meteora pool
    ]);

    // Handle swap if we are using the reward token
    let rewardTokenBalance = null;
    if (Constants.kRewardTokenMintPubkey.length > 0)
    {
        console.log(`Swapping ${totalLamportsToSend / LAMPORTS_PER_SOL} SOL for reward token with mint address ${Constants.kRewardTokenMintPubkey}...`);
        const swapResult = await swapToken(connection, ownerKeypair, Constants.kWSOLMint, totalLamportsToSend,  Constants.kRewardTokenMintPubkey, Constants.kFeeRecipientWalletPubkey);
        if (!swapResult.success)
        {
            console.error('Unable to swap SOL to reward token!');
        }

        rewardTokenBalance = await getRewardTokenBalance(connection);
        if (rewardTokenBalance.balance == 0) {
            console.log("No token balance found for the reward token to distribute.");
            return;
        }
    }

    // Fetch the total supply from the mint account
    const mintAccount = await getMint(connection, new PublicKey(Constants.kTokenMintPubkey), {commitment: "confirmed"}, TOKEN_2022_PROGRAM_ID);
    const totalSupply = mintAccount.supply;

    const instructions = [];
    const walletsData = [];

    // Prepare transfer instructions for each holder
    for (const accountInfo of allAccounts) {
        const account = unpackAccount(
            accountInfo.pubkey,
            accountInfo.account,
            TOKEN_2022_PROGRAM_ID
        );
        
        const tokenAmount = Number(account.amount) / Math.pow(10, Constants.kTokenDecimals);
        if (excludedWallets.has(account.owner.toBase58()) || tokenAmount < Constants.kRewardMinHolding)
            continue;

        if (Constants.kRewardTokenMintPubkey.length > 0) {

            // Get the associated token account for the holder
            const holderTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                ownerKeypair,
                new PublicKey(Constants.kRewardTokenMintPubkey),
                account.owner,
                true,
                "finalized",
                { commitment: "finalized" }, // Confirmation options
                rewardTokenBalance.programId
            );

            const holderTokenShare = (BigInt(account.amount) * BigInt(rewardTokenBalance.balance)) / BigInt(totalSupply);

            // Transfer reward tokens
            instructions.push(
                createTransferCheckedInstruction(
                    rewardTokenBalance.address,
                    new PublicKey(Constants.kRewardTokenMintPubkey),
                    holderTokenAccount.address,
                    ownerKeypair.publicKey,
                    holderTokenShare,
                    rewardTokenBalance.decimals,
                    [],
                    rewardTokenBalance.programId
                ),
            );
            
            walletsData.push({
                walletAddress: account.owner.toBase58(),
                amountEarned: Number(holderTokenShare) / 10 ** rewardTokenBalance.decimals,
                tokenSymbol: Constants.kRewardTokenSymbol
            });
        } else {
            const holderShare = (BigInt(account.amount) * BigInt(totalLamportsToSend)) / BigInt(totalSupply);

            // If SOL amount is too small, skip.
            // We keep accumulating until we have enough to distribute.
            if (holderShare < BigInt(Constants.kSolMinLimit * LAMPORTS_PER_SOL)) {
                continue;
            }

            // Transfer SOL
            instructions.push(
                SystemProgram.transfer({
                    fromPubkey: ownerKeypair.publicKey,
                    toPubkey: account.owner,
                    lamports: holderShare
                })
            );

            walletsData.push({
                walletAddress: account.owner.toBase58(),
                amountEarned: Number(holderShare) / LAMPORTS_PER_SOL,
                tokenSymbol: "SOL"
            });
        }
    }

    let transactionUrl = "";

    // Distribute in batches to make sure we don't hit the Solana transaction size limit of 1232 bytes 
    for (let i = 0; i < instructions.length; i += Constants.kBatchSize) {
        const transaction = new Transaction().add(...instructions.slice(i, i + Constants.kBatchSize));

        // TODO: should we use sendAndConfirmTransaction instead? Not sure if it's a good idea to wait for each batch to confirm.
        const signature = await sendAndConfirmTransaction(connection, transaction, [ownerKeypair]);
        //const signature = await connection.sendTransaction(transaction, [ownerKeypair]);

        // Save the transaction URL for the last batch
        transactionUrl = `https://solscan.io/tx/${signature}?cluster=${Constants.kSolanaNetwork}`;
        
        const batchIndex = i / Constants.kBatchSize + 1;
        console.log(`Batch ${batchIndex} sent. Signature: ${transactionUrl}`);

        console.log("Sending notification to Telegram bot...");
        await notifyTelegramBot(walletsData.slice(i, i + Constants.kBatchSize), transactionUrl);
    }

    console.log(`Submitted ${instructions.length} transfer TXs).`);
}

async function notifyTelegramBot(walletsData, transactionUrl)
{
    // Send notification to the API
    const notificationPayload = {
        wallets: walletsData,
        transactionUrl: transactionUrl
    };

    try {
        const response = await fetch(Config.backendUrl + "/rewards/notify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
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

/**
 * Main function to distribute rewards to existing holders.
 * After a certain amount of tokens has been accumulated, it first burns a specified amount, then swaps the rest for SOL to provide rewards.
 * It then sends the rewards to the treasury wallet and the holders.
 */
async function distributeRewards() {
    if (isRunning) {
        console.log("distributeRewards is already running. Skipping this call.");
        return;
    }

    isRunning = true;

    try {
        console.log("===================================");
        console.log("Starting Rewards Distribution Cycle");
        console.log("===================================");

        const mint = new PublicKey(Constants.kTokenMintPubkey); 

        // Connection to the cluster
        const connection = new Connection(Config.heliusMainnetUrl, "confirmed");

         // Collect withheld fees first
        console.log("\n--- Collecting Withheld Fees ---");
        const collectionResult = await collectFees(connection, ownerKeypair);
        if (collectionResult.success && collectionResult.collected > 0) {
            console.log(`✓ Successfully collected ${collectionResult.collected} tokens from ${collectionResult.accountsProcessed} accounts`);
        }

        // Get the token account of the owner
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            ownerKeypair,
            mint,
            ownerKeypair.publicKey,
            true,
            "finalized",
            { commitment: "finalized" }, // Confirmation options
            TOKEN_2022_PROGRAM_ID,
        );

        // Check if we have enough tokens to distribute
        const tokenAmount = await connection.getTokenAccountBalance(tokenAccount.address);
        const tokenBalance = tokenAmount.value.amount;
        if (tokenBalance < BigInt(Constants.kTokensToAccumulate * 10 ** tokenAmount.value.decimals)) {
            console.log("Not enough tokens to distribute rewards");
            return;
        }

        // Calculate the amount of tokens to burn
        let burnAmount = 0;
        if (Constants.kBurnPercent !== 0) {
            burnAmount = Math.floor(tokenBalance * (Constants.kBurnPercent / 100));
            const tokensToBurn = burnAmount / Math.pow(10, tokenAmount.value.decimals);
            console.log(`Burning ${tokensToBurn} tokens (${Constants.kBurnPercent}%)...`);

            // Build and send the Burn transaction
            const signature = await burnChecked(
                connection,
                ownerKeypair,
                tokenAccount.address,
                mint,
                ownerKeypair.publicKey,
                burnAmount,
                tokenAmount.value.decimals,
                undefined,
                undefined,
                TOKEN_2022_PROGRAM_ID,
            );
            console.log(`✓ Burn completed. Signature: https://solscan.io/tx/${signature}?cluster=${Constants.kSolanaNetwork}`);
        }

        // Swap remaining tokens for SOL (or the reward token if it's set)
        const remainingTokenAmount = tokenBalance - burnAmount;
        const tokensToSwap = remainingTokenAmount / Math.pow(10, tokenAmount.value.decimals)
        console.log(`Swapping ${tokensToSwap} tokens for SOL...`);
        const swapResult = await swapToken(connection, ownerKeypair, Constants.kTokenMintPubkey, remainingTokenAmount, Constants.kWSOLMint, Constants.kFeeRecipientWalletPubkey);  

        // Finally, divide the SOL among the holders and treasury wallet
        if (swapResult.success) {

            // Get current SOL balance
            let accountBalance = await connection.getBalance(ownerKeypair.publicKey);
            if (accountBalance < Constants.kSolToReserve * LAMPORTS_PER_SOL) {
                console.log("Not enough SOL to distribute rewards");
                return;
            }

            // Always reserve some SOL for fees
            accountBalance -= Constants.kSolToReserve * LAMPORTS_PER_SOL;

            // Divide the remaining accountBalance between the jackpot, treasury, and holders
            const jackpotLamports = Math.floor(accountBalance * (Constants.kLotteryPercent / 100));
            const treasuryLamports = Math.floor(accountBalance * (Constants.kTreasuryPercent / 100));
            const holdersLamports = accountBalance - jackpotLamports - treasuryLamports;

            console.log(`Distribution breakdown:`);
            console.log(`  - Jackpot: ${jackpotLamports / LAMPORTS_PER_SOL} SOL (${Constants.kLotteryPercent}%)`);
            console.log(`  - Treasury: ${treasuryLamports / LAMPORTS_PER_SOL} SOL (${Constants.kTreasuryPercent}%)`);
            console.log(`  - Holders: ${holdersLamports / LAMPORTS_PER_SOL} SOL`);

            // Send SOL to the jackpots wallet
            console.log(`Sending ${jackpotLamports / LAMPORTS_PER_SOL} SOL to the jackpots wallet...`);
            const jackpotWallet = new PublicKey(Constants.kJackpotWalletPubKey);
            const jackpotTransferTransaction = new Transaction().add(
                SystemProgram.transfer({
                  fromPubkey: ownerKeypair.publicKey,
                  toPubkey: jackpotWallet,
                  lamports: jackpotLamports,
                }),
            );
            const jackpotSig = await sendAndConfirmTransaction(connection, jackpotTransferTransaction, [ownerKeypair]);
            console.log(`✓ Sent to jackpot. Signature: https://solscan.io/tx/${jackpotSig}?cluster=${Constants.kSolanaNetwork}`);

            // Send SOL to the treasury wallet
            console.log(`Sending ${treasuryLamports / LAMPORTS_PER_SOL} SOL to the treasury wallet...`);
            const treasuryWallet = new PublicKey(/*Constants.kTreasuryWalletPubkey*/Constants.kBuybackWalletPubkey);
            const treasuryTransferTransaction = new Transaction().add(
                SystemProgram.transfer({
                  fromPubkey: ownerKeypair.publicKey,
                  toPubkey: treasuryWallet,
                  lamports: treasuryLamports,
                }),
            );
            const treasurySig = await sendAndConfirmTransaction(connection, treasuryTransferTransaction, [ownerKeypair]);
            console.log(`✓ Sent to treasury. Signature: https://solscan.io/tx/${treasurySig}?cluster=${Constants.kSolanaNetwork}`);

            // Send the rest to the holders
            await distributeToHolders(connection, holdersLamports);

            console.log("\n==============================");
            console.log("✓ Rewards Distribution Complete!");
            console.log("================================");
        }
    } catch (error) {
        console.error("An error occurred during the reward distribution process:", error);
    } finally {
        isRunning = false;
    }
}


// Load the owner wallet keypair
try {
    ownerKeypair = await loadKeypairFromFile(Config.feeRecipientKeyFile);
    //console.log(`Owner public key: ${ownerKeypair.publicKey.toBase58()}`);
} catch (error) {
    console.error("Failed to load the owner keypair:", error);
    throw error;
}

// Run it once first
await distributeRewards().catch(console.error);

// Run it every X minutes
setInterval(() => {
  distributeRewards().catch(console.error);
}, 300000); // 300000 milliseconds = 5 minutes

// Keep the application running
process.stdin.resume();