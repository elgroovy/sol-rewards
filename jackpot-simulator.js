import {
    Connection,
    SystemProgram,
    Transaction,
    PublicKey,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
    getMint,
    unpackAccount,
    createTransferInstruction,
    getOrCreateAssociatedTokenAccount,
    TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync
} from "@solana/spl-token";

import { swapToken } from './jupiter-swap.js';
import { loadKeypairFromFile } from "./keypair-utils.js";
import { Constants } from './constants.js';
import { Config } from './config.js';
import fetch from 'node-fetch';
import crypto from 'crypto';
import WebSocket from 'ws';

let jackpotKeypair, treasuryKeypair = null;
let jackpotCheckInterval = Constants.kJackpotCheckInterval;

const SIMULATION_MODE = false; // Set to false for production

// Connection to the cluster
const connection = new Connection(Config.heliusMainnetUrl, "confirmed");

async function getLastHoldersSnapshot()
{
    try {
        const response = await fetch(Config.backendUrl + "/jackpots/holders", {
            method: "GET",
            headers: {
            "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error(`Failed to retrieve holders snapshot. Status: ${response.status}, Message: ${await response.text()}`);
        } else {
            console.log("Holders snapshot retrieved successfully.");
        }
        const responseData = await response.json();
        return responseData.holders;
    } catch (error) {
        console.error("Failed to retrieve holders snapshot:", error);
    }
}

async function updateHoldersSnapshot(addresses)
{
    try {
        // Update the holders snapshot and retrieve the new holders
        const response = await fetch(Config.backendUrl + "/jackpots/holders", {
            method: "PUT",
            headers: {
            "Content-Type": "application/json"
            },
            body: JSON.stringify({ addresses: addresses })
        });

        if (!response.ok) {
            console.error(`Failed to update holders snapshot. Status: ${response.status}, Message: ${await response.text()}`);
        } else {
            console.log("Holders snapshot updated successfully.");
        }
        const responseData = await response.json();
        return responseData.newHolders;
    } catch (error) {
        console.error("Failed to update holders snapshot:", error);
    }
}

async function sendEarnedSolToWallets(walletsToSendTo)
{
    const instructions = [];
    for (const wallet of walletsToSendTo) {
        console.log(`Sending ${wallet.solEarned} SOL to holder ${wallet.walletAddress}...`);

        const targetWalletPubkey = new PublicKey(wallet.walletAddress);
        instructions.push(
            SystemProgram.transfer({
                fromPubkey: jackpotKeypair.publicKey,
                toPubkey: targetWalletPubkey,
                lamports: Math.round(Number(wallet.solEarned) * LAMPORTS_PER_SOL),
            }),
        );
    }
   
    if (instructions.length !== 0) {
        const transferTransaction = new Transaction().add(...instructions);
        const signature = await sendAndConfirmTransaction(connection, transferTransaction, [jackpotKeypair]);
        const txUrl = `https://solscan.io/tx/${signature}?cluster=${Constants.kSolanaNetwork}`;
        console.log(`TX Sent. Signature: ${txUrl}`);
        
        return txUrl;
    }

    throw new Error("No instructions to send SOL to holders.");
}

async function notifyTelegramBot(notificationPayload)
{
    try {
        const response = await fetch(Config.backendUrl + "/jackpots/notify", {
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

async function sendCommand(commmand)
{
    await notifyTelegramBot({
        messageType: "command",
        messageText: commmand
    });
}

async function sendSimpleMessage(message, delay)
{
        await notifyTelegramBot({
        messageType: "simple",
        messageText: message,
        mediaUrl: 'http://ipfs.io/ipfs/bafkreickxiijov32aotpy4zki3hhfi6bwmgxdvvfmomafxc2fijcmh2p6i',
        isAnimated: true
    });

    // Wait couple seconds...
    await new Promise(resolve => setTimeout(resolve, delay));
}

async function simulateJackpotDraw(jackpotBalance, luckyOldHolder, luckyNewHolder, oldHoldersShare, newHoldersShare)
{
    //sendCommand("/lock all");

    await sendSimpleMessage(`Balance OK (${jackpotBalance.toFixed(3)} SOL). Proceeding with the jackpot draw!`, 5000);

    await notifyTelegramBot({
        messageType: "simple",
        messageText: "Let's see who's the lucky winner of the jackpot!",
        mediaUrl: 'https://ipfs.io/ipfs/bafybeigil4zx5aomfg2ssbyhbxfre5el7vcfan42ax766kmsrl5heqdueu',
        isAnimated: true
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    await notifyTelegramBot({
        messageType: "simple",
        messageText: "",
        mediaUrl: 'https://ipfs.io/ipfs/bafybeia7vfzsijvtmrlcmnwi6jyjc6hwtxntrsfp6oion54d5kozmxaqr4',
        isAnimated: true
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    await notifyTelegramBot({
        messageType: "simple",
        messageText: "",
        mediaUrl: 'http://ipfs.io/ipfs/bafybeic2bbshok6dx6n4va2k4d4xu7ickrsq7hhah5mjltlps623gqmo7u',
        isAnimated: true
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    let walletsToSendTo = [];
    
    let messageText = "";
    if (luckyOldHolder && oldHoldersShare > 0)
    {
        const formattedOldHolder = `${luckyOldHolder.slice(0, 4)}...${luckyOldHolder.slice(-4)}`;
        messageText += `${formattedOldHolder}\n🔥 OLD holder, winning ${oldHoldersShare.toFixed(4)} SOL!\n\n`;

        walletsToSendTo.push({
            walletAddress: luckyOldHolder,
            solEarned: oldHoldersShare
        });
    }

    if (luckyNewHolder && newHoldersShare > 0)
    {
        const formattedNewHolder = `${luckyNewHolder.slice(0, 4)}...${luckyNewHolder.slice(-4)}`;
        messageText += `${formattedNewHolder}\n🔥 NEW holder, winning ${newHoldersShare.toFixed(4)} SOL!\n\n`;

        walletsToSendTo.push({
            walletAddress: luckyNewHolder,
            solEarned: newHoldersShare
        });
    }

    if (walletsToSendTo.length > 0)
    {
        // SIMULATION MODE: Comment out the real transaction and use a fake URL
        let txUrl = "";
        if (!SIMULATION_MODE) {
            txUrl = await sendEarnedSolToWallets(walletsToSendTo);
        } else {
            txUrl = `https://solscan.io/tx/SIMULATED_TX_${Date.now()}?cluster=${Constants.kSolanaNetwork}`;
            console.log(`[SIMULATION] Would send to:`, walletsToSendTo);
        }

        messageText += `👏 Congratulations! 👏 \n[TX](${txUrl})`;

        await notifyTelegramBot({
            messageType: "simple",
            messageText: messageText,
            mediaUrl: 'http://ipfs.io/ipfs/bafybeicj3vtbn57fhsqdndrr45pndm2vtblfpege2tsheyn47zvilkvcke',
            isAnimated: true
        });
    }
    else
    {
        messageText = `Oh snap, nobody won this time! 😩`;

        await notifyTelegramBot({
            messageType: "simple",
            messageText: messageText,
            mediaUrl: 'http://ipfs.io/ipfs/bafybeidfoeal4c6g5xopnkoi5wdjl2ifhwwrjcjiaojv5ujrsqh7lamd3e',
            isAnimated: true
        });
    }

    //sendCommand("/unlock all");
}

async function getHoldersShareOfJackpot(jackpotAmount, holderAccount, totalSupply)
{
    try {
        const holderAccountPubkey = new PublicKey(holderAccount);
        let tokenAccounts = await connection.getTokenAccountsByOwner(holderAccountPubkey, {mint: new PublicKey(Constants.kTokenMintPubkey)});
        if (tokenAccounts.value.length === 0) {
            throw new Error("No token accounts found for the holder.");
        }
        let tokenAmount = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
        const tokenBalance = tokenAmount.value.amount;
        // Map the 0.0 - 0.5% of the supply to 0.0 - 1.0 of the jackpot amount.
        // 0.5% would let them take the whole jackpot.
        // This is to let people with less than 1% of the supply still have a good win. It'll be hard to acquire 1% of the supply anyway.
        const holderSupplyNormalized = Math.min(1.0, Math.max(0.0, 200 * Number(tokenBalance) / Number(totalSupply)));
        return jackpotAmount * holderSupplyNormalized;
    }
    catch (error) {
        console.error("Failed to retrieve token account balance:", error);
        return 0;
    }
}

// Cryptographic random number genereator
function getRandomIndex(arrayLength) {
    const randomBytes = crypto.randomBytes(4); // generate 4 random bytes
    const randomValue = randomBytes.readUInt32BE(0); // convert to a 32-bit unsigned integer
    return randomValue % arrayLength; // map to the array length
}

async function drawJackpot(currentHolders, newHolders, drawAmount)
{
    // Draw the jackpot
    console.log("Drawing the jackpot...");

    // Split the jackpot between old and new holders
    const oldHoldersJackpotFund = drawAmount * Constants.kOldHoldersShare;
    const newHoldersJackpotFund = drawAmount * Constants.kNewHoldersShare;

    let oldHoldersShare = 0, newHoldersShare = 0;
    let luckyOldHolder = null, luckyNewHolder = null;

    // Fetch the total supply from the mint account
    /*const mintAccount = await getMint(connection, new PublicKey(Constants.kTokenMintPubkey), {commitment: "confirmed"}, TOKEN_2022_PROGRAM_ID);
    const totalSupply = mintAccount.supply;*/

    // Find a random old holder
    if (currentHolders.length !== 0) {
        let attempts = 0;
        const maxAttempts = 100; // prevent infinite loop in case of edge cases

        do {
            luckyOldHolder = currentHolders[getRandomIndex(currentHolders.length)];
            attempts++;
        } while (newHolders.includes(luckyOldHolder) && attempts < maxAttempts);

        if (attempts >= maxAttempts) {
            console.log("Could not find a suitable old holder after multiple attempts.");
            luckyOldHolder = null;
        } else {
            console.log("Found lucky old holder:", luckyOldHolder);
            oldHoldersShare = oldHoldersJackpotFund; //await getHoldersShareOfJackpot(oldHoldersJackpotFund, luckyOldHolder, totalSupply);
        }
    } else {
        console.log("Cannot find any old holders.");
    }

    // Find a random new holder
    if (newHolders.length !== 0) {
        luckyNewHolder = newHolders[getRandomIndex(newHolders.length)];
        console.log("Found lucky new holder:", luckyNewHolder);
        newHoldersShare = newHoldersJackpotFund; //await getHoldersShareOfJackpot(newHoldersJackpotFund, luckyNewHolder, totalSupply);
    } else {
        console.log("Cannot find any new holders.");
    }

    // Determine the final winner
    if (luckyOldHolder && luckyNewHolder) {
        const isOldHolderWinner = getRandomIndex(2) === 0; // 50-50 chance
        if (isOldHolderWinner) {
            luckyNewHolder = null;
            newHoldersShare = 0;
        } else {
            luckyOldHolder = null;
            oldHoldersShare = 0;
        }
    }

    await simulateJackpotDraw(drawAmount, luckyOldHolder, luckyNewHolder, oldHoldersShare, newHoldersShare);
}

async function getCurrentHoldersSnapshot()
{
    try {
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
        
        // Manual exclusions of certain system wallets
        const MANUAL_EXCLUSIONS = new Set([
            Constants.kTreasuryWalletPubkey,
            Constants.kFeeRecipientWalletPubkey,
            Constants.kBuybackWalletPubkey,
            Constants.kJackpotWalletPubKey,
            Constants.kBurnWalletPubkey,
        ]);

        // Grab all addresses that meet the minimum holding requirement
        const holderAddresses = [];
        for (const accountInfo of allAccounts) {
            const account = unpackAccount(
                accountInfo.pubkey,
                accountInfo.account,
                TOKEN_2022_PROGRAM_ID
            );

            const accountPubkey = account.owner.toBase58();

            // Skip manual exclusions
            if (MANUAL_EXCLUSIONS.has(accountPubkey)) {
                continue;
            }

            // Skip PDAs (off-curve addresses, like pool vaults, program accounts etc.)
            if (!PublicKey.isOnCurve(account.owner.toBytes())) {
                console.log(`Skipping ${accountPubkey} - off-curve (likely a pool/PDA)`);
                continue;
            }

            // Check token balance threshold
            const tokenAmount = Number(account.amount) / Math.pow(10, Constants.kTokenDecimals);
            if (tokenAmount < Constants.kJackpotEligibilityMinHolding) {
                continue;
            }

            holderAddresses.push(accountPubkey);
        }

        return holderAddresses;
    } catch (error) {
        console.error("Failed to retrieve current holders snapshot:", error);
        return [];
    }
}

async function handleTreasuryAutoDistribute() {
    let rewardTokenAccount = null;

    if (Constants.kRewardTokenMintPubkey.length !== 0) {
        // Determine the token program ID for the reward token mint
        const mintAccountInfo = await connection.getAccountInfo(new PublicKey(Constants.kRewardTokenMintPubkey));
        if (!mintAccountInfo) {
            console.error("Failed to fetch mint account info for the reward token.");
            return;
        }

        const tokenProgramId = mintAccountInfo.owner;

        // Compute the associated token account for the reward token mint
        rewardTokenAccount = getAssociatedTokenAddressSync(
            new PublicKey(Constants.kRewardTokenMintPubkey),
            new PublicKey(Constants.kTreasuryWalletPubkey),
            true, // allow owner to be off-curve
            tokenProgramId
        );
    }

    const subscriptionMap = new Map(); // map to store subscription IDs
    
    const ws = new WebSocket(Config.heliusMainnetUrl);

    ws.on('open', async () => {
        console.log("WebSocket connection established. Watching Treasury account for deposits...");

        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping(); // Send a ping message
                //console.log('WS ping sent');
            }
        }, 30000); // Every 30 seconds

        // Subscribe to the Treasury wallet for SOL deposits
        ws.send(JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "accountSubscribe",
            params: [
                Constants.kTreasuryWalletPubkey,
                {
                    commitment: "finalized",
                    encoding: "jsonParsed"
                }
            ]
        }));

        // Subscribe to the reward token account
        ws.send(JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            method: "accountSubscribe",
            params: [
                rewardTokenAccount.toBase58(),
                {
                    commitment: "finalized",
                    encoding: "jsonParsed"
                }
            ]
        }));
        console.log(`Subscribed to reward token account: ${rewardTokenAccount.toBase58()}`);
    });

    ws.on('message', async (data) => {
        try {
            const parsedData = JSON.parse(data);

            // Handle subscription response to map id -> subscriptionId
            if (parsedData.id && parsedData.result) {
                subscriptionMap.set(parsedData.id, parsedData.result);
                console.log(`Mapped id ${parsedData.id} to subscriptionId ${parsedData.result}`);
                return;
            }

            if (parsedData.method === "accountNotification") {
                const accountPubkey = (parsedData.params.subscription == subscriptionMap.get(1)) ? Constants.kTreasuryWalletPubkey : rewardTokenAccount.toBase58();

                // Fetch recent transactions for the account
                const signatures = await connection.getSignaturesForAddress(new PublicKey(accountPubkey), { limit: 1 });
                const transferTx = await connection.getParsedTransaction(signatures[0].signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
                if (!transferTx) {
                    console.error("Transaction not found.");
                    return;
                }

                const instructions = transferTx.transaction.message.instructions;
                let lamportsSent = 0;
                let tokensSent = 0;

                let tokenProgramId = null;

                for (const instruction of instructions) {
                    if (instruction.programId.equals(SystemProgram.programId)) {
                        // Handle SOL transfer
                        if ((instruction.parsed.type === "transfer" || instruction.parsed.type === "transferChecked") && instruction.parsed.info.destination === accountPubkey) {
                            lamportsSent += instruction.parsed.info.lamports;
                        }
                    } else if (instruction.programId.equals(TOKEN_PROGRAM_ID)) {
                        // Handle token transfer
                        if (instruction.parsed.type === "transfer" && instruction.parsed.info.destination === accountPubkey) {
                            tokensSent += Number(instruction.parsed.info.amount);
                            tokenProgramId = instruction.programId;
                        } else if (instruction.parsed.type === "transferChecked" && instruction.parsed.info.destination === accountPubkey) {
                            tokensSent += Number(instruction.parsed.info.tokenAmount.amount);
                            tokenProgramId = instruction.programId;
                        }
                    }
                }

                let transferInstructions = [];

                if (lamportsSent > Constants.kSolMinLimit * LAMPORTS_PER_SOL) {
                    console.log(`Treasury balance change detected: +${lamportsSent / LAMPORTS_PER_SOL} SOL`);
                    const jackpotShareLamports = lamportsSent * Constants.kTreasuryShareOfJackpot;
                    const jackpotShare = jackpotShareLamports / LAMPORTS_PER_SOL;

                    console.log(`Sending ${jackpotShare} SOL to the jackpot wallet...`);
                    transferInstructions.push(
                        SystemProgram.transfer({
                            fromPubkey: new PublicKey(Constants.kTreasuryWalletPubkey),
                            toPubkey: jackpotKeypair.publicKey,
                            lamports: Math.round(jackpotShareLamports)
                        })
                    );
                }

                if (tokensSent > 0) {
                    console.log(`Treasury token balance change detected: +${tokensSent / Math.pow(10, Constants.kRewardTokenDecimals)} tokens`);
                    const jackpotShareTokens = tokensSent * Constants.kTreasuryShareOfJackpot;

                    console.log(`Sending ${jackpotShareTokens / Math.pow(10, Constants.kRewardTokenDecimals)} tokens to the jackpot wallet...`);

                    const jackpotTokenAccount = await getOrCreateAssociatedTokenAccount(
                        connection,
                        treasuryKeypair,
                        new PublicKey(Constants.kRewardTokenMintPubkey),
                        jackpotKeypair.publicKey,
                        true,
                        "finalized",
                        { commitment: "finalized" }, // Confirmation options
                        tokenProgramId
                    );

                    // Add token transfer instructions to transaction
                    transferInstructions.push(
                      createTransferInstruction(
                        new PublicKey(accountPubkey),
                        jackpotTokenAccount.address,
                        treasuryKeypair.publicKey,
                        Math.round(jackpotShareTokens)
                      ),
                    );
                }

                if (transferInstructions.length > 0)
                {
                    const transferTx = new Transaction().add(...transferInstructions);
                    const signature = await sendAndConfirmTransaction(connection, transferTx, [treasuryKeypair]);
                    const txUrl = `https://solscan.io/tx/${signature}?cluster=${Constants.kSolanaNetwork}`;
                    console.log(`TX Sent. Signature: ${txUrl}`);
                }
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
        }
    });

    ws.on('error', (error) => {
        console.error("WebSocket error:", error);
    });

    ws.on('close', () => {
        console.log("WebSocket connection closed. Attempting to reconnect...");
        setTimeout(() => {
            handleTreasuryAutoDistribute(); // Reinitialize the WebSocket connection
        }, 5000);
    });
}

async function checkTokenBalanceAndSwap() {
    try {
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
            jackpotKeypair.publicKey,
            true, // allow owner to be off-curve
            tokenProgramId
        );
    
        const info = await connection.getTokenAccountBalance(rewardTokenAccount);
        if (info.value.uiAmount == null) {
            console.error("No reward token balance found.");
            return;
        }
    
        const tokensToSwap = info.value.uiAmount;
        if (tokensToSwap < Constants.kJackpotTokensToAccumulate) {
            console.log(`Not enough reward tokens to swap. Current balance: ${tokensToSwap} tokens.`);
            return;
        }

        console.log(`Swapping ${tokensToSwap} tokens for SOL...`);
        const swapResult = await swapToken(
            connection,
            jackpotKeypair,
            Constants.kRewardTokenMintPubkey,
            Math.floor(tokensToSwap * Math.pow(10, info.value.decimals)),
            Constants.kWSOLMint,
            Constants.kJackpotWalletPubKey
        );
    
        // Handle the swap result
        if (swapResult.success) {
            console.log("Reward token swap successful.");
        } else {
            console.error("Reward token swap failed.");
        }
    } catch (error) {
        console.error(error);
    }
}

async function handleJackpots() {
    try {
        if (Constants.kRewardTokenMintPubkey.length !== 0) {
            await checkTokenBalanceAndSwap();
        }

        let accountBalance = await connection.getBalance(jackpotKeypair.publicKey);
        let currBalance = accountBalance / LAMPORTS_PER_SOL;
        // Always reserve some SOL for fees
        currBalance = Math.max(0, currBalance - 0.01);

        await sendSimpleMessage("Verifying account balance...", 5000);

        // In simulation mode, use a fake balance if real balance is too low
        const balanceToUse = SIMULATION_MODE ? Constants.kJackpotThreshold + 0.1 : currBalance;

        if (balanceToUse > Constants.kJackpotThreshold) {
            console.log(`${SIMULATION_MODE ? '[SIMULATION] ' : ''}Jackpot wallet balance: ${balanceToUse} SOL${SIMULATION_MODE ? ` (using ${balanceToUse} SOL for simulation)` : ''}`);

            // Reset the check interval
            jackpotCheckInterval = Constants.kJackpotCheckInterval;

            // Grab the current holders snapshot
            const holderAddresses = SIMULATION_MODE ? [Constants.kTreasuryWalletPubkey] : await getCurrentHoldersSnapshot();
            if (holderAddresses.length > 0) {
                // Store the snapshot on the server
                const newHolders = SIMULATION_MODE ? [] : await updateHoldersSnapshot(holderAddresses);
                await drawJackpot(holderAddresses, newHolders, balanceToUse);
            } else {
                console.log("No eligible holders found for the jackpot draw.");
                await sendSimpleMessage("No eligible holders found for the jackpot draw.");
            }
        } else {
            console.log("Insufficient balance to draw the jackpot.");
            jackpotCheckInterval = Math.min(jackpotCheckInterval * 2, 8 * 60); // 8 hours max
            const nextCheckDelayText = jackpotCheckInterval >= 60 ? `${Math.floor(jackpotCheckInterval / 60)} hour(s)` : `${jackpotCheckInterval} mins`; 
            await sendSimpleMessage(`Jackpot draw requires more SOL.\nCurrent balance: ${balanceToUse.toFixed(3)} SOL.\nCurrent threshold: ${Constants.kJackpotThreshold} SOL.\nI'll check again in ${nextCheckDelayText}!`);
        }
    } catch (error) {
        console.error("Error handling jackpots:", error);
    } finally {
        // Retry after predefined time period in case of an error.
        // In simulation mode, don't retry automatically
        if (!SIMULATION_MODE) {
            setTimeout(handleJackpots, jackpotCheckInterval * 60 * 1000);
        } else {
            console.log("[SIMULATION] Skipping automatic retry. Run manually to test again.");
        }
    }
}

// Load the owner wallet keypair
try {
    jackpotKeypair = await loadKeypairFromFile(Config.jackpotKeyFile);
    treasuryKeypair = await loadKeypairFromFile(Config.treasuryKeyFile);
} catch (error) {
    console.error("Failed to load the keypair:", error);
    throw error;
}

// Watch for the account balance changes and auto-distribute to the jackpot wallet
//await handleTreasuryAutoDistribute();

// Run it once first
await handleJackpots().catch(console.error);

// Keep the application running
process.stdin.resume();