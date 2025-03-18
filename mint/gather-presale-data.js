
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { createObjectCsvWriter as csvWriter } from 'csv-writer';
import fs from 'fs';


const MINIMUM_SOL_AMOUNT = 0.0001 * LAMPORTS_PER_SOL; // a minimum SOL amount to filter spammy transactions

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=fd4ac0ba-d60e-4b97-b121-22141efc9c16');
const presaleAddress = new PublicKey('zVioKp1fSEQk65UCUQE1nr7fsqmpE3ZLehy7pxBS14D');

async function gatherPresaleData() {
    try {
        const signatures = await connection.getSignaturesForAddress(presaleAddress);
        console.log(`Found ${signatures.length} transactions`);
        const presaleData = [];

        for (const sig of signatures) {
            const tx = await connection.getTransaction(sig.signature, { commitment: undefined, maxSupportedTransactionVersion: undefined });
            const accountKeys = tx.transaction.message.getAccountKeys();
            const accountIndex = accountKeys.staticAccountKeys.findIndex((pubkey) => pubkey.equals(presaleAddress));

            const preBalance = tx.meta.preBalances[accountIndex];
            const postBalance = tx.meta.postBalances[accountIndex];
            if (postBalance > preBalance) {
                const lamportsSentIn = postBalance - preBalance;

                presaleData.push({
                    walletAddress: accountKeys.staticAccountKeys[0].toString(),
                    solAmount: lamportsSentIn / LAMPORTS_PER_SOL
                });
            }
        }

        // Merge contributions from the same wallet
        const mergedPresaleData = presaleData.reduce((acc, current) => {
            const existing = acc.find(item => item.walletAddress === current.walletAddress);
            if (existing) {
                existing.solAmount += current.solAmount;
            } else {
                acc.push(current);
            }
            return acc;
        }, []);

        // Filter out spammy transactions
        const filteredPresaleData = mergedPresaleData.filter(item => item.solAmount >= MINIMUM_SOL_AMOUNT);

        console.log(filteredPresaleData);

        const csvWriterInstance = csvWriter({
            path: 'presale_data.csv',
            header: [
                { id: 'walletAddress', title: 'walletAddress' },
                { id: 'contribution', title: 'contribution' }
            ]
        });

        await csvWriterInstance.writeRecords(filteredPresaleData);
        console.log('CSV file created successfully.');
    } catch (error) {
        console.error("Error gathering presale data: " + error);
    }
}

gatherPresaleData().catch(console.error);