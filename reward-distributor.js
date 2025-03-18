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
    getMint,
    unpackAccount,
    burnChecked,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";

import { loadKeypairFromFile } from "./keypair-utils.js";
import { swapToken } from './jupiter-swap.js';
import { Constants } from './constants.js';


let ownerKeypair = null;
let isRunning = false; // flag to track if reward distribution is running

async function distributeSolToHolders(connection, totalLamportsToSend) {
    console.log(`Sending ${totalLamportsToSend / LAMPORTS_PER_SOL} SOL to holders...`);

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
        ownerKeypair.pubkey.toBase58(),
        Constants.kBurnWalletPubkey,
    ]);
    
    // Fetch the total supply from the mint account
    const mintAccount = await getMint(connection, new PublicKey(Constants.kTokenMintPubkey), {commitment: "confirmed"}, TOKEN_2022_PROGRAM_ID);
    const totalSupply = mintAccount.supply;

    const instructions = [];

    // Prepare SOL transfer instructions for each holder
    for (const accountInfo of allAccounts) {
        const account = unpackAccount(
            accountInfo.pubkey,
            accountInfo.account,
            TOKEN_2022_PROGRAM_ID
        );
        
        if (excludedWallets.has(account.owner.toBase58()))
            continue;

        const holderShare = (BigInt(account.amount) * BigInt(totalLamportsToSend)) / BigInt(totalSupply);

        // If SOL amount is too small, skip.
        // We keep accumulating until we have enough to distribute.
        if (holderShare < BigInt(Constants.kSolMinLimit * LAMPORTS_PER_SOL)) {
            continue;
        }

        instructions.push(
            SystemProgram.transfer({
                fromPubkey: ownerKeypair.publicKey,
                toPubkey: account.owner,
                lamports: holderShare
            })
        );
    }

    // Distribute SOL in batches to make sure we don't hit the Solana transaction size limit of 1232 bytes 
    for (let i = 0; i < instructions.length; i += Constants.kBatchSize) {
        const transaction = new Transaction().add(...instructions.slice(i, i + Constants.kBatchSize));

        // TODO: should we use sendAndConfirmTransaction instead? Not sure if it's a good idea to wait for each batch to confirm.
        const signature = await sendAndConfirmTransaction(connection, transaction, [ownerKeypair]);
        //const signature = await connection.sendTransaction(transaction, [ownerKeypair]);
        
        const batchIndex = i / Constants.kBatchSize + 1; 
        console.log(`Batch ${batchIndex} sent. Signature: https://solscan.io/tx/${signature}?cluster=${Constants.kSolanaNetwork}`);
    }

    console.log(`Submitted ${instructions.length} SOL transfer TXs.`);
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
        const mint = new PublicKey(Constants.kTokenMintPubkey); 

        // Connection to the cluster
        const connection = new Connection(clusterApiUrl(Constants.kSolanaNetwork), "confirmed");

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

        // See if we already hit the token limit to start distributing rewards
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
            console.log(`Burning ${tokensToBurn} tokens...`);

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
            console.log(`Burn completed. Signature: https://solscan.io/tx/${signature}?cluster=${Constants.kSolanaNetwork}`);
        }

        // Swap remaining tokens for SOL
        const remainingTokenAmount = tokenBalance - burnAmount;
        const tokensToSwap = remainingTokenAmount / Math.pow(10, tokenAmount.value.decimals)
        console.log(`Swapping ${tokensToSwap} tokens for SOL...`);
        /*const swapResult = await swapToken(connection, ownerKeypair, mint, remainingTokenAmount, 'So11111111111111111111111111111111111111112', Constants.kSwapSlippage);  

        // Finally, divide the SOL among the holders and treasury wallet
        if (swapResult.success)*/ {

            // Get current SOL balance
            let accountBalance = await connection.getBalance(ownerKeypair.publicKey);
            if (accountBalance < Constants.kSolToReserve * LAMPORTS_PER_SOL) {
                console.log("Not enough SOL to distribute rewards");
                return;
            }

            // Always reserve some SOL for fees
            accountBalance -= Constants.kSolToReserve * LAMPORTS_PER_SOL;

            // Send SOL to the treasury wallet
            const treasuryLamports = Math.floor(accountBalance * (Constants.kTreasuryPercent / 100));
            console.log(`Sending ${treasuryLamports / LAMPORTS_PER_SOL} SOL to the treasury wallet...`);
            const treasuryWallet = new PublicKey(Constants.kTreasuryWalletPubkey);
            const transferTransaction = new Transaction().add(
                SystemProgram.transfer({
                  fromPubkey: ownerKeypair.publicKey,
                  toPubkey: treasuryWallet,
                  lamports: treasuryLamports,
                }),
            );
            const signature = await sendAndConfirmTransaction(connection, transferTransaction, [ownerKeypair]);
            console.log(`Sent to treasury. Signature: https://solscan.io/tx/${signature}?cluster=${Constants.kSolanaNetwork}`);

            accountBalance -= treasuryLamports;

            // Send the rest to the holders
            await distributeSolToHolders(connection, accountBalance);
        }
    } catch (error) {
        console.error("An error occurred during the reward distribution process:", error);
    } finally {
        isRunning = false;
    }
}


// Load the owner wallet keypair
try {
    ownerKeypair = await loadKeypairFromFile(Constants.kFeeRecipientWalletKeyFile);
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