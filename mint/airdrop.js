
import { Connection, PublicKey, clusterApiUrl, SystemProgram } from '@solana/web3.js';
import { mintToChecked, getOrCreateAssociatedTokenAccount, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

import { TokenConfig } from './token-config.js';
import { Constants } from '../constants.js';

import { loadKeypairFromFile } from "../keypair-utils.js";

import fs from 'fs';
import csv from 'csv-parser'


/**
 * This script performs an airdrop of tokens to a list of wallet addresses specified in a CSV file.
 * It reads the CSV file to get the wallet addresses and their respective contributions,
 * calculates the share of tokens each address should receive based on their contribution,
 * and then mints and sends the appropriate amount of tokens to each address.
 * The script uses the Solana web3.js library and the SPL Token library to interact with the Solana blockchain.
 */

const TOTAL_TOKENS_TO_DISTRIBUTE = Math.floor(1_000_000_000 * 0.7); // 70%

const csvFilePath = '/home/elisa/sol-rewards/mint/airdrop.csv';
let totalContribution = 0;
let contributions = [];

const connection = new Connection(clusterApiUrl(TokenConfig.kSolanaNetwork), "confirmed");
const mintPubkey = new PublicKey(Constants.kTokenMintPubkey);

// Load the owner wallet keypair
let ownerKeypair = null;
try {
    ownerKeypair = await loadKeypairFromFile(TokenConfig.kOwnerWalletKeyFile);
} catch (error) {
    console.error("Failed to load the owner keypair:", error);
    throw error;
}

try {
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            const walletAddress = row.walletAddress;
            const contribution = parseFloat(row.contribution);
            contributions.push({ walletAddress, contribution });
            totalContribution += contribution;
        })
        .on('end', async () => {
            console.log('CSV file successfully processed. Starting airdrop...');
            for (const { walletAddress, contribution } of contributions) {
                const share = contribution / totalContribution;
                const amountToMint = BigInt(Math.floor(share * TOTAL_TOKENS_TO_DISTRIBUTE)) * BigInt(10 ** TokenConfig.kDecimals);
    
                const recipientPublicKey = new PublicKey(walletAddress);

                // Get the token account of the recipientPublicKey. If it does not exist, create it
                const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
                    connection,
                    ownerKeypair,
                    mintPubkey,
                    recipientPublicKey,
                    true,
                    "finalized",
                    { commitment: "finalized" }, // confirmation options
                    TOKEN_2022_PROGRAM_ID,
                );
    
                let txhash = await mintToChecked(
                    connection,
                    ownerKeypair,
                    mintPubkey,
                    destinationTokenAccount.address,
                    ownerKeypair.publicKey,
                    amountToMint,
                    TokenConfig.kDecimals,
                    [],
                    { commitment: "finalized" }, // confirmation options
                    TOKEN_2022_PROGRAM_ID
                );
                console.log(`Sent to ${walletAddress}, txhash: ${txhash}`);
            }
            console.log("Airdop finished.");
        });
} catch (error) {
    console.error(error);
}