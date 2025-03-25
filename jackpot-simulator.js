import {
    Connection,
    Keypair,
    PublicKey,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
    unpackAccount,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";

import { loadKeypairFromFile } from "./keypair-utils.js";
import { Constants } from './constants.js';
import fetch from 'node-fetch';

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

async function getJackpotBalance()
{
    //return 3; // simulate the jackpot balance

    // Get current SOL balance
    return await connection.getBalance(ownerKeypair.publicKey);
}

async function sendSolToHolder(walletAddress, solAmount)
{
    console.log(`Sending ${solAmount} SOL to holder ${walletAddress}...`);
}

async function notifyTelegramBot(notificationPayloud)
{
    try {
        const url = Constants.kBackendUrl + "/api/jackpots/notifications";
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
        mediaUrl: 'http://ipfs.io/ipfs/bafkreigzg3tlqipquyzwvjhwmjgaqt7ncewdw2hqjbjabslazvgmf37ta4',
        isAnimated: false
    });

    // Wait couple seconds...
    await new Promise(resolve => setTimeout(resolve, delay));
}

async function simulateJackpotDraw(luckyOldHolder, luckyNewHolder, oldHoldersShare, newHoldersShare)
{
    //sendCommand("/lock all");

    await sendSimpleMessage("Checking current balance...", 5000);
    const totalDrawAmount = oldHoldersShare + newHoldersShare;
    await sendSimpleMessage(`Balance OK (${totalDrawAmount.toFixed(3)} SOL). Proceeding with the jackpot draw!`, 5000);

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

    let messageText = "";
    if (luckyOldHolder)
    {
        const formattedOldHolder = `${luckyOldHolder.slice(0, 4)}...${luckyOldHolder.slice(-4)}`;
        messageText += `${formattedOldHolder}\n🔥 OLD holder, winning ${oldHoldersShare.toFixed(4)} SOL!\n\n`;
    }

    if (luckyNewHolder)
    {
        const formattedNewHolder = `${luckyNewHolder.slice(0, 4)}...${luckyNewHolder.slice(-4)}`;
        messageText += `${formattedNewHolder}\n🔥 NEW holder, winning ${newHoldersShare.toFixed(4)} SOL!\n\n`;
    }
    messageText += `👏 Congratulations! 👏 \n[TX](https://solscan.io/tx/fake_transaction_url)`;

    await notifyTelegramBot({
        messageType: "simple",
        messageText: messageText,
        mediaUrl: 'http://ipfs.io/ipfs/bafybeicj3vtbn57fhsqdndrr45pndm2vtblfpege2tsheyn47zvilkvcke',
        isAnimated: true
    });

    // Wait couple seconds...
    await new Promise(resolve => setTimeout(resolve, 2000));

    //sendCommand("/unlock all");

    // Send SOL to the holders as the very last step
    if (luckyOldHolder) {
        await sendSolToHolder(luckyOldHolder, oldHoldersShare);
    }
    if (luckyNewHolder) {
        await sendSolToHolder(luckyNewHolder, newHoldersShare);
    }
}

async function drawJackpot(currentHolders, newHolders, drawAmount)
{
    // Draw the jackpot
    console.log("Drawing the jackpot...");

    // Split the jackpot between old and new holders
    const oldHoldersShare = drawAmount * Constants.kOldHoldersShare;
    const newHoldersShare = drawAmount * Constants.kNewHoldersShare;

    let luckyOldHolder = null;
    let luckyNewHolder = null;

    // Find a random old holder
    if (currentHolders.length !== 0) {
        let attempts = 0;
        const maxAttempts = 100; // prevent infinite loop in case of edge cases

        do {
            luckyOldHolder = currentHolders[Math.floor(Math.random() * currentHolders.length)];
            attempts++;
        } while (newHolders.includes(luckyOldHolder) && attempts < maxAttempts);

        if (attempts >= maxAttempts) {
            console.log("Could not find a suitable old holder after multiple attempts.");
            luckyOldHolder = null;
        } else {
            console.log("Found lucky old holder:", luckyOldHolder);
        }
    } else {
        console.log("No old holders to send the jackpot to.");
    }

    // Find a random new holder
    if (newHolders.length !== 0) {
        luckyNewHolder = newHolders[Math.floor(Math.random() * newHolders.length)];
        console.log("Found lucky new holder:", luckyNewHolder);
    } else {
        console.log("No new holders to send the jackpot to.");
    }

    await simulateJackpotDraw(luckyOldHolder, luckyNewHolder, oldHoldersShare, newHoldersShare);
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
            Constants.kRaydiumVaultAuthority2 // Rayiudm pool
        ]);

        // Grab all addresses
        const holderAddresses = allAccounts
            .map((accountInfo) => accountInfo.pubkey.toBase58())
            .filter((address) => !excludedWallets.has(address));

        return holderAddresses;
    } catch (error) {
        console.error("Failed to retrieve current holders snapshot:", error);
        return [];
    }
}

async function main(currentHolders = []) {

    connection.onAccountChange(
        new PublicKey(Constants.kJackpotWalletPubKey),
        async (account, context) => {
          if (account.lamports > /*LAMPORTS_PER_SOL*/ 1) {
            const currBalance = account.lamports / LAMPORTS_PER_SOL;
            console.log(`Jackpot wallet balance: ${currBalance} SOL`);
    
            // Check if the jackpot balance is enough to draw
            if (currBalance < Constants.kJackpotThreshold) {
                console.log("Insufficient balance to draw the jackpot.");
                //return;
            }
    
            const holderAddresses = await getCurrentHoldersSnapshot();
            if (holderAddresses.length > 0) {
                const newHolders = await updateHoldersSnapshot(holderAddresses);
                await drawJackpot(holderAddresses, newHolders, currBalance);
            } else {
                console.log("No holders to draw the jackpot for.");
            }
          }
        },
        "processed",
        { encoding: "base64", dataSlice: { offset: 0, length: 100 }}
    );
}

// Load the owner wallet keypair
try {
    ownerKeypair = await loadKeypairFromFile(Constants.kJackpotWalletKeyFile);
    //console.log(`Owner public key: ${ownerKeypair.publicKey.toBase58()}`);
} catch (error) {
    console.error("Failed to load the owner keypair:", error);
    throw error;
}

await main().catch((error) => console.log(error));