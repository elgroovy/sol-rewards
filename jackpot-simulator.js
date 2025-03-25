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
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";

import { loadKeypairFromFile } from "./keypair-utils.js";
import { Constants } from './constants.js';
import fetch from 'node-fetch';
import crypto from 'crypto';

let ownerKeypair = null;

// Connection to the cluster
const connection = new Connection(/*clusterApiUrl(Constants.kSolanaNetwork)*/Constants.kHeliusRPCEndpoint, "confirmed");

async function getLastHoldersSnapshot()
{
    try {
        const response = await fetch(Constants.kBackendUrl + "/api/jackpots/holders", {
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
        const response = await fetch(Constants.kBackendUrl + "/api/jackpots/holders", {
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
                fromPubkey: ownerKeypair.publicKey,
                toPubkey: targetWalletPubkey,
                lamports: Math.round(Number(wallet.solEarned) * LAMPORTS_PER_SOL),
            }),
        );
    }
   
    if (instructions.length !== 0) {
        const transferTransaction = new Transaction().add(...instructions);
        const signature = await sendAndConfirmTransaction(connection, transferTransaction, [ownerKeypair]);
        const txUrl = `https://solscan.io/tx/${signature}?cluster=${Constants.kSolanaNetwork}`;
        console.log(`TX Sent. Signature: ${txUrl}`);
        
        return txUrl;
    }

    throw new Error("No instructions to send SOL to holders.");
}

async function notifyTelegramBot(notificationPayloud)
{
    try {
        const response = await fetch(Constants.kBackendUrl + "/api/jackpots/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(notificationPayloud)
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
        mediaUrl: 'http://ipfs.io/ipfs/bafybeiafg5xpibm4d2fhrtiucnoafzxwsefdftzvh62xttgks2nbwifg5e',
        isAnimated: false
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
        const txUrl = await sendEarnedSolToWallets(walletsToSendTo);

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
    const mintAccount = await getMint(connection, new PublicKey(Constants.kTokenMintPubkey), {commitment: "confirmed"}, TOKEN_2022_PROGRAM_ID);
    const totalSupply = mintAccount.supply;

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
            oldHoldersShare = await getHoldersShareOfJackpot(oldHoldersJackpotFund, luckyOldHolder, totalSupply);
        }
    } else {
        console.log("No old holders to send the jackpot to.");
    }

    // Find a random new holder
    if (newHolders.length !== 0) {
        luckyNewHolder = newHolders[getRandomIndex(newHolders.length)];
        console.log("Found lucky new holder:", luckyNewHolder);
        newHoldersShare = await getHoldersShareOfJackpot(newHoldersJackpotFund, luckyNewHolder, totalSupply);
    } else {
        console.log("No new holders to send the jackpot to.");
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
        
        // Exclude Fee, Treasury, Jackpot and Burn wallets from the list of holders
        const excludedWallets = new Set([
            Constants.kFeeRecipientWalletPubkey,
            Constants.kTreasuryWalletPubkey,
            ownerKeypair.publicKey.toBase58(), // Jackpot wallet
            Constants.kBurnWalletPubkey,
            Constants.kRaydiumVaultAuthority2 // Raydium pool
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
            const tokenAmount = Number(account.amount) / Math.pow(10, Constants.kTokenDecimals);
            if (excludedWallets.has(accountPubkey) || tokenAmount < Constants.kJackpotEligibilityMinHolding) {
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

async function handleJackpots() {
    try {
        let accountBalance = await connection.getBalance(ownerKeypair.publicKey);
        let currBalance = accountBalance / LAMPORTS_PER_SOL;
        // Always reserve some SOL for fees
        currBalance = Math.max(0, currBalance - 0.01);

        await sendSimpleMessage("Verifying account balance...", 5000);

        if (currBalance > Constants.kJackpotThreshold) {
            console.log(`Jackpot wallet balance: ${currBalance} SOL`);

            // Grab the current holders snapshot
            const holderAddresses = await getCurrentHoldersSnapshot();
            if (holderAddresses.length > 0) {
                // Store the snapshot on the server
                const newHolders = await updateHoldersSnapshot(holderAddresses);
                await drawJackpot(holderAddresses, newHolders, currBalance);
            } else {
                console.log("No eligible holders found for the jackpot draw.");
                await sendSimpleMessage("No eligible holders found for the jackpot draw.");
            }
        } else {
            console.log("Insufficient balance to draw the jackpot.");
            await sendSimpleMessage(`Jackpot draw requires more SOL.\nCurrent balance: (${currBalance.toFixed(3)} SOL.\nCurrent threshold: ${Constants.kJackpotThreshold} SOL.\nI'll check again in 1 hour!`);
        }
    } catch (error) {
        console.error("Error handling jackpots:", error);
    } finally {
        // Retry after predefined time period in case of an error
        setTimeout(handleJackpots, Constants.kJackpotCheckInterval * 60 * 1000);
    }
}

// Load the owner wallet keypair
try {
    ownerKeypair = await loadKeypairFromFile(Constants.kJackpotWalletKeyFile);
    //console.log(`Owner public key: ${ownerKeypair.publicKey.toBase58()}`);
} catch (error) {
    console.error("Failed to load the owner keypair:", error);
    throw error;
}

// Run it once first
await handleJackpots().catch(console.error);

// Keep the application running
process.stdin.resume();