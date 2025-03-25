
import { VersionedTransaction } from "@solana/web3.js";
//import { Keypair } from "@solana/web3.js";
//import { Connection } from "@solana/web3.js";

import axios from 'axios';

/**
 * Swaps tokens using the Jupiter API.
 *
 * @param {object} connection - The Solana connection object.
 * @param {object} keypair - The keypair of the user performing the swap.
 * @param {string} inputMint - The mint address of the input token.
 * @param {number} inputAmmount - The amount of input tokens to swap.
 * @param {string} outputMint - The mint address of the output token.
 * @param {number} slippageBps - The slippage tolerance in basis points.
 * @returns {Promise<void>} - A promise that resolves when the swap is complete.
 */
export async function swapToken(connection, keypair, inputMint, inputAmmount, outputMint, slippageBps) {
    try {
        const quoteResponse = await axios.get('https://api.jup.ag/swap/v1/quote', {
        params: {
            inputMint: inputMint,
            outputMint: outputMint,
            amount: inputAmmount,
            slippageBps: slippageBps
        }
        });
        //console.log({ quoteResponse: quoteResponse.data });

        // Get serialized transactions for the swap
        const swapResponse = await axios.post('https://api.jup.ag/swap/v1/swap', {
            quoteResponse: quoteResponse.data,
            userPublicKey: keypair.publicKey.toString(),
            wrapAndUnwrapSol: true,
            prioritizationFeeLamports: 10000
            }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const { swapTransaction } = swapResponse.data;

        // Deserialize the transaction
        const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
        var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        //console.log(transaction);

        // Replace the blockhash
        const bhInfo = (await connection.getLatestBlockhashAndContext('finalized'));
        transaction.message.recentBlockhash = bhInfo.value.blockhash;

        // Sign the transaction
        transaction.sign([keypair]);

        // Simulate the transaction
        const simulation = await connection.simulateTransaction(transaction, { commitment: 'processed' });
        if (simulation.value.err) {
            throw new Error('Simulate failed: ' + simulation.value.err);
        }
        // Send the transaction
        const signature = await connection.sendTransaction(transaction, { skipPreflight: true, preflightCommitment: 'processed' });
        const confirmation = await connection.confirmTransaction(signature, { commitment: 'finalized', lastValidBlockHeight: bhInfo.value.lastValidBlockHeight });
        if (confirmation.value.err) {
            throw new Error('Transaction failed: ' + confirmation.value.err);
        }
        console.log(`Swap TX landed: https://solscan.io/tx/${signature}`);

        return { success: true };
    } catch (error) {
        console.error('Error during swap:', error);
        
        return { success: false, error: error.message };
    }
}