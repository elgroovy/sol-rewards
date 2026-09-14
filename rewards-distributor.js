import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL
} from "@solana/web3.js";

import {
    getOrCreateAssociatedTokenAccount,
    getAssociatedTokenAddressSync,
    unpackAccount,
    burnChecked,
    createTransferCheckedInstruction,
    getMint,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";

import { loadKeypairFromFile } from "./keypair-utils.js";
import { swapToken } from './jupiter-swap.js';
import { Constants } from './constants.js';
import { Config } from './config.js';
import { notifyBackend } from './notify-backend.js';
import { collectFees } from './fee-collector.js';
import * as db from './db.js';


let ownerKeypair = null;
let isRunning = false; // flag to track if reward distribution is running

// Headroom above the reserve so a batch cannot land the wallet exactly on empty.
const kFeeBufferLamports = 20000;

// Collapses a list of addresses into one short log line. These run every cycle,
// so logging them one per line buries everything else.
function summariseAddresses(addresses) {
    return addresses.map(a => a.slice(0, 8)).join(", ");
}


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

async function getBalances(connection, pubkeys) {
    const BATCH_SIZE = 100;
    const balanceMap = new Map();

    for (let i = 0; i < pubkeys.length; i += BATCH_SIZE) {
        const batch = pubkeys.slice(i, i + BATCH_SIZE);
        const accountInfos = await connection.getMultipleAccountsInfo(batch);

        batch.forEach((pubkey, idx) => {
            balanceMap.set(pubkey.toBase58(), accountInfos[idx]?.lamports || 0);
        });
    }

    return balanceMap;
}

async function savePendingRewards(pendingRewards) {
    if (pendingRewards.length === 0) return;

    const sql = `
        INSERT INTO pending_rewards (wallet, amount_lamports, accumulated_count, first_accumulated_at, last_accumulated_at)
        VALUES ?
        ON DUPLICATE KEY UPDATE
            amount_lamports = amount_lamports + VALUES(amount_lamports),
            accumulated_count = accumulated_count + 1,
            last_accumulated_at = CURRENT_TIMESTAMP
    `;

    const values = pendingRewards.map(p => [p.wallet, p.amount, 1, new Date(), new Date()]);
    await db.query(sql, [values]);
    console.log(`Saved ${pendingRewards.length} pending reward entries to database`);
}

async function getDistributablePendingRewards(minLamports) {
    const [rows] = await db.query(
        'SELECT wallet, amount_lamports FROM pending_rewards WHERE amount_lamports >= ?',
        [minLamports]
    );
    return rows;
}

/**
 * Splits the outstanding pending rewards into what can actually be paid and what
 * cannot. A wallet holding no SOL is skipped at payout - transferring to it would
 * have to create the account, which costs more than the reward - so holding its
 * share back would lock that SOL away permanently. Only reachable amounts are
 * withheld from distribution. Unreachable ones keep their claim in the database.
 */
async function getPendingRewardsBreakdown(connection) {
    const [rows] = await db.query('SELECT wallet, amount_lamports FROM pending_rewards');
    if (rows.length === 0) {
        return { reachableLamports: 0, unreachableLamports: 0, unreachableCount: 0 };
    }

    const balanceMap = await getBalances(connection, rows.map(r => new PublicKey(r.wallet)));

    let reachableLamports = 0;
    let unreachableLamports = 0;
    let unreachableCount = 0;

    for (const row of rows) {
        const amount = Number(row.amount_lamports);
        if ((balanceMap.get(row.wallet) || 0) > 0) {
            reachableLamports += amount;
        } else {
            unreachableLamports += amount;
            unreachableCount++;
        }
    }

    return { reachableLamports, unreachableLamports, unreachableCount };
}

async function clearDistributedPendingRewards(wallets) {
    if (wallets.length === 0) return;
    await db.query(
        'DELETE FROM pending_rewards WHERE wallet IN (?)',
        [wallets]
    );
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

    // Get all owner pubkeys for balance checking (only needed for SOL distribution)
    let balanceMap = new Map();
    if (Constants.kRewardTokenMintPubkey.length === 0) {
        const ownerPubkeys = allAccounts.map(accountInfo => 
            unpackAccount(accountInfo.pubkey, accountInfo.account, TOKEN_2022_PROGRAM_ID).owner
        );
        console.log(`Fetching SOL balances for ${ownerPubkeys.length} holders...`);
        balanceMap = await getBalances(connection, ownerPubkeys);
    }

    // Manual exclusions of certain system wallets
    const MANUAL_EXCLUSIONS = new Set([
        //Constants.kTreasuryWalletPubkey,
        Constants.kFeeRecipientWalletPubkey,
        Constants.kBuybackWalletPubkey,
        Constants.kJackpotWalletPubKey,
        Constants.kBurnWalletPubkey,
    ]);

    let skippedPDA = 0;
    let skippedManual = 0;
    let skippedBalance = 0;
    let skippedMinShare = 0;
    let skippedUnreachable = 0;
    const skippedPDAAddresses = [];
    const skippedUnreachableAddresses = [];

    const instructions = [];
    const walletsData = [];
    const pendingRewards = [];

    // First pass: filter eligible holders and calculate sqrt weights
    const eligibleHolders = [];

    for (const accountInfo of allAccounts) {
        const account = unpackAccount(
            accountInfo.pubkey,
            accountInfo.account,
            TOKEN_2022_PROGRAM_ID
        );

        const ownerAddress = account.owner.toBase58();

        // Skip manual exclusions
        if (MANUAL_EXCLUSIONS.has(ownerAddress)) {
            skippedManual++;
            continue;
        }

        // Skip PDAs (off-curve addresses, like pool vaults, program accounts etc.)
        if (!PublicKey.isOnCurve(account.owner.toBytes())) {
            skippedPDAAddresses.push(ownerAddress);
            skippedPDA++;
            continue;
        }

        // Check token balance threshold
        const tokenAmount = Number(account.amount) / Math.pow(10, Constants.kTokenDecimals);
        if (tokenAmount < Constants.kRewardMinHolding) {
            skippedBalance++;
            continue;
        }

        // Calculate square root weight for fairer distribution
        const sqrtWeight = Math.sqrt(Number(account.amount));

        eligibleHolders.push({
            account,
            ownerAddress,
            sqrtWeight
        });
    }

    console.log(`Eligible holders for sqrt distribution: ${eligibleHolders.length}`);

    // Fetch the total supply from the mint account for sqrt-based distribution
    const mintAccount = await getMint(connection, new PublicKey(Constants.kTokenMintPubkey), "confirmed", TOKEN_2022_PROGRAM_ID);
    const totalSupply = Number(mintAccount.supply);
    console.log(`Total supply: ${totalSupply / Math.pow(10, Constants.kTokenDecimals)}`);

    // Normalise against the sum of the eligible holders' weights, NOT sqrt(totalSupply).
    // sqrt is concave, so the sum of the individual roots far exceeds the root of the
    // sum: dividing by sqrt(totalSupply) makes the shares add up to well over 100% of
    // the budget and drains the wallet part-way through the batches.
    const sumSqrtWeights = eligibleHolders.reduce((sum, h) => sum + h.sqrtWeight, 0);
    let allocatedLamports = 0n;

    // Second pass: calculate shares and create transfer instructions
    for (const holder of eligibleHolders) {
        const { account, ownerAddress, sqrtWeight } = holder;

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

            // Square root weighted share for token distribution
            const shareRatio = sumSqrtWeights > 0 ? sqrtWeight / sumSqrtWeights : 0;
            const holderTokenShare = BigInt(Math.floor(shareRatio * Number(rewardTokenBalance.balance)));

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
                walletAddress: ownerAddress,
                amountEarned: Number(holderTokenShare) / 10 ** rewardTokenBalance.decimals,
                tokenSymbol: Constants.kRewardTokenSymbol
            });
        } else {
            // Square root weighted share for SOL distribution
            const shareRatio = sumSqrtWeights > 0 ? sqrtWeight / sumSqrtWeights : 0;
            const holderShare = BigInt(Math.floor(shareRatio * totalLamportsToSend));

            // A wallet with no SOL cannot be paid: the transfer would have to create
            // the account, which costs more than the reward. Bank the share instead of
            // dropping it - checking this after the minimum meant small rewards were
            // banked while larger ones were silently lost.
            const recipientBalance = balanceMap.get(ownerAddress) || 0;
            const isUnreachable = recipientBalance === 0;
            if (isUnreachable) {
                skippedUnreachableAddresses.push(ownerAddress);
                skippedUnreachable++;
            }

            // Too small to be worth a transaction fee, or not payable yet: accrue it.
            if (isUnreachable || holderShare < BigInt(Constants.kSolMinLimit * LAMPORTS_PER_SOL)) {
                if (holderShare > 0n) {
                    pendingRewards.push({
                        wallet: ownerAddress,
                        amount: Number(holderShare)
                    });
                    if (!isUnreachable) skippedMinShare++;
                }
                continue;
            }

            // Transfer SOL
            allocatedLamports += holderShare;
            instructions.push(
                SystemProgram.transfer({
                    fromPubkey: ownerKeypair.publicKey,
                    toPubkey: account.owner,
                    lamports: holderShare
                })
            );

            walletsData.push({
                walletAddress: ownerAddress,
                amountEarned: Number(holderShare) / LAMPORTS_PER_SOL,
                tokenSymbol: "SOL"
            });
        }
    }

    if (skippedPDAAddresses.length > 0) {
        console.log(`Skipped ${skippedPDAAddresses.length} off-curve account(s) (pools/PDAs): ${summariseAddresses(skippedPDAAddresses)}`);
    }
    if (skippedUnreachableAddresses.length > 0) {
        console.log(`Accrued rewards for ${skippedUnreachableAddresses.length} wallet(s) with no SOL balance: ${summariseAddresses(skippedUnreachableAddresses)}`);
    }

    console.log(`Filtered: ${skippedPDA} PDAs, ${skippedManual} manual exclusions, ${skippedBalance} below threshold balance, ${skippedMinShare} added to pending, ${skippedUnreachable} accrued for wallets with no SOL`);
    console.log(`Eligible holders: ${instructions.length}`);

    // Never pay out more than the budget: a mis-normalised share would otherwise
    // drain the fee reserve mid-batch and leave later holders unpaid.
    if (allocatedLamports > BigInt(Math.floor(totalLamportsToSend))) {
        console.error(`Refusing to distribute: allocated ${Number(allocatedLamports) / LAMPORTS_PER_SOL} SOL exceeds the ${totalLamportsToSend / LAMPORTS_PER_SOL} SOL budget`);
        return;
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

        await notifyTelegramBot({
            messageType: "rewards",
            wallets: walletsData.slice(i, i + Constants.kBatchSize),
            transactionUrl: transactionUrl
        });
    }

    if (instructions.length > 0) {
        console.log(`Submitted ${instructions.length} transfer TXs.`);
    }

    // Save pending rewards to database (they accumulate over multiple cycles)
    await savePendingRewards(pendingRewards);

    // Only check for distributable pending rewards if we had immediate distributions this cycle.
    // If all holders went to pending, their amounts are definitely still below threshold.
    if (instructions.length > 0) {
        await distributeAcumulatedPendingRewards(connection);
    } else {
        console.log("No immediate distributions this cycle - amounts still accumulating");
    }
}

async function distributeAcumulatedPendingRewards(connection) {
    const distributablePending = await getDistributablePendingRewards(Constants.kSolMinLimit * LAMPORTS_PER_SOL);
    if (distributablePending.length > 0) {
        console.log(`Found ${distributablePending.length} wallets with distributable pending rewards`);

        const pendingInstructions = [];
        const pendingWalletsData = [];
        const pendingLamports = [];
        const distributedWallets = [];
        const skippedPendingAddresses = [];

        // One batched lookup instead of a getBalance per wallet: the per-wallet loop
        // rate-limited the RPC once the table grew past a few dozen entries.
        const pendingBalances = await getBalances(connection, distributablePending.map(p => new PublicKey(p.wallet)));

        for (const pending of distributablePending) {
            const recipientPubkey = new PublicKey(pending.wallet);

            // Check SOL balance
            const recipientBalance = pendingBalances.get(pending.wallet) || 0;
            if (recipientBalance === 0) {
                skippedPendingAddresses.push(pending.wallet);
                continue;
            }

            pendingInstructions.push(
                SystemProgram.transfer({
                    fromPubkey: ownerKeypair.publicKey,
                    toPubkey: recipientPubkey,
                    lamports: BigInt(pending.amount_lamports)
                })
            );

            pendingWalletsData.push({
                walletAddress: pending.wallet,
                amountEarned: Number(pending.amount_lamports) / LAMPORTS_PER_SOL,
                tokenSymbol: "SOL"
            });

            pendingLamports.push(Number(pending.amount_lamports));
            distributedWallets.push(pending.wallet);
        }

        if (skippedPendingAddresses.length > 0) {
            console.log(`Skipping ${skippedPendingAddresses.length} pending wallet(s) with no SOL balance: ${summariseAddresses(skippedPendingAddresses)}`);
        }

        // Send pending rewards in batches.
        // Each batch is cleared from the database as soon as it confirms: clearing
        // all of them only at the end means a batch that throws part-way leaves the
        // already-paid wallets in the table, and they get paid again next cycle.
        let clearedCount = 0;

        for (let i = 0; i < pendingInstructions.length; i += Constants.kBatchSize) {
            const batchInstructions = pendingInstructions.slice(i, i + Constants.kBatchSize);
            const batchWallets = distributedWallets.slice(i, i + Constants.kBatchSize);
            const batchWalletsData = pendingWalletsData.slice(i, i + Constants.kBatchSize);
            const batchLamports = pendingLamports.slice(i, i + Constants.kBatchSize).reduce((sum, n) => sum + n, 0);

            // This path pays what the database says is owed, so it has to check the
            // wallet can actually cover it. Stopping here leaves the rest in the
            // table to be paid by a later cycle.
            const balance = await connection.getBalance(ownerKeypair.publicKey);
            const needed = batchLamports + Constants.kSolToReserve * LAMPORTS_PER_SOL + kFeeBufferLamports;
            if (balance < needed) {
                console.error(`Stopping pending payout: need ${needed / LAMPORTS_PER_SOL} SOL (incl. reserve), wallet has ${balance / LAMPORTS_PER_SOL} SOL. ${pendingInstructions.length - i} wallet(s) left in the table for a later cycle.`);
                break;
            }

            const transaction = new Transaction().add(...batchInstructions);
            const signature = await sendAndConfirmTransaction(connection, transaction, [ownerKeypair]);
            const txUrl = `https://solscan.io/tx/${signature}?cluster=${Constants.kSolanaNetwork}`;
            console.log(`Pending rewards batch sent: ${txUrl}`);

            // Clear before notifying: the notification retries for ~37s and must not
            // sit between a confirmed payment and the database catching up.
            try {
                await clearDistributedPendingRewards(batchWallets);
                clearedCount += batchWallets.length;
            } catch (error) {
                console.error(`PAID BUT NOT CLEARED: ${batchWallets.length} wallet(s) in ${signature} are still in pending_rewards and will be paid again. Remove them manually: ${batchWallets.join(", ")}`, error);
            }

            await notifyTelegramBot({
                messageType: "rewards",
                wallets: batchWalletsData,
                transactionUrl: txUrl
            });
        }

        console.log(`Cleared ${clearedCount} distributed pending rewards from database`);
    }
}

async function notifyTelegramBot(notificationPayload)
{
    return notifyBackend(notificationPayload);
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
        const hasEnoughTokens = tokenBalance >= BigInt(Constants.kTokensToAccumulate * 10 ** tokenAmount.value.decimals);

        // Not having enough tokens only means there is nothing new to sell. Any SOL
        // banked by an earlier cycle that swapped but could not pay out is still
        // distributable, so fall through to the SOL stage instead of returning.
        let swapSucceeded = false;
        if (!hasEnoughTokens) {
            console.log("Not enough tokens to swap - checking for SOL already in the wallet...");
        } else {

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
            swapSucceeded = swapResult.success;
        }

        // Finally, divide the SOL among the holders and treasury wallet.
        // A failed swap still skips this, so we never pay out on a broken cycle.
        if (swapSucceeded || !hasEnoughTokens) {

            // Get current SOL balance
            let accountBalance = await connection.getBalance(ownerKeypair.publicKey);
            if (accountBalance < Constants.kSolToReserve * LAMPORTS_PER_SOL) {
                console.log("Not enough SOL to distribute rewards");
                return;
            }

            // Always reserve some SOL for fees
            accountBalance -= Constants.kSolToReserve * LAMPORTS_PER_SOL;

            // Pending rewards are already promised to specific holders, but the SOL
            // backing them is still sitting in this wallet. Without excluding it here
            // it gets re-split every cycle - partly to the jackpot and treasury - so
            // the database ends up owing more than the wallet can pay.
            const pending = await getPendingRewardsBreakdown(connection);
            if (pending.reachableLamports > 0) {
                console.log(`Holding back ${pending.reachableLamports / LAMPORTS_PER_SOL} SOL already owed as pending rewards`);
                accountBalance -= pending.reachableLamports;
            }
            if (pending.unreachableCount > 0) {
                console.log(`Not holding back ${pending.unreachableLamports / LAMPORTS_PER_SOL} SOL owed to ${pending.unreachableCount} wallet(s) with no SOL balance - they keep their claim but cannot be paid until they hold some SOL`);
            }

            if (accountBalance <= 0) {
                console.log("Nothing new to distribute - the remaining balance is owed to pending rewards. Paying those out only.");
                await distributeAcumulatedPendingRewards(connection);
                return;
            }

            // Below this the payout is not worth making: the jackpot and treasury
            // transfers cost a fixed fee each, every holder share lands under
            // kSolMinLimit and just grows the pending table, and nobody actually
            // gets paid. Leave the SOL to accumulate into a real distribution.
            if (accountBalance < Constants.kMinSolToDistribute * LAMPORTS_PER_SOL) {
                console.log(`Only ${accountBalance / LAMPORTS_PER_SOL} SOL distributable, below the ${Constants.kMinSolToDistribute} SOL minimum - letting it accumulate`);
                // Still pay out pending rewards: those are already owed and may have
                // accumulated enough to send, independently of this cycle being small.
                await distributeAcumulatedPendingRewards(connection);
                return;
            }

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