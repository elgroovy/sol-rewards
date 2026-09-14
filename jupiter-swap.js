
import { VersionedTransaction } from "@solana/web3.js";
import axios from 'axios';

// A key is only valid on api.jup.ag (paid plan). Without one we use the free
// lite-api host, which rejects the x-api-key header.
const JUPITER_API_KEY = process.env.JUPITER_API_KEY || '';
const JUPITER_API_HOST = JUPITER_API_KEY ? 'https://api.jup.ag' : 'https://lite-api.jup.ag';
const jupiterHeaders = JUPITER_API_KEY ? { 'x-api-key': JUPITER_API_KEY } : {};

/**
 * Swaps tokens using the Jupiter API.
 *
 * @param {object} connection - The Solana connection object.
 * @param {object} keypair - The keypair of the user performing the swap.
 * @param {string} inputMint - The mint address of the input token.
 * @param {number} inputAmmount - The amount of input tokens to swap.
 * @param {string} outputMint - The mint address of the output token.
 * @param {number} takerWallet - The wallet address of the taker.
 * @returns {Promise<void>} - A promise that resolves when the swap is complete.
 */
export async function swapToken(connection, keypair, inputMint, inputAmmount, outputMint, takerWallet) {
    try {
        const orderResponse = await axios.get(`${JUPITER_API_HOST}/ultra/v1/order`, {
        params: {
            inputMint: inputMint,
            outputMint: outputMint,
            amount: inputAmmount,
            taker: takerWallet
        },
        headers: jupiterHeaders
        });
        //console.log({ orderResponse: orderResponse.data });

        // Deserialize, sign and serialize the transaction
        const transaction = VersionedTransaction.deserialize(Buffer.from(orderResponse.data.transaction, 'base64'));
        //console.log(transaction);
        transaction.sign([keypair]);
        const signedTransaction = Buffer.from(transaction.serialize()).toString('base64');

        const executeResponse = await (
            await fetch(`${JUPITER_API_HOST}/ultra/v1/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...jupiterHeaders,
                },
                body: JSON.stringify({
                    signedTransaction: signedTransaction,
                    requestId: orderResponse.data.requestId,
                }),
            })
        ).json();

        if (executeResponse.status === "Success") {
            console.log(`Swap TX landed: https://solscan.io/tx/${executeResponse.signature}`);
        } else {
            console.error('Swap failed:', JSON.stringify(executeResponse, null, 2));
            console.log(`https://solscan.io/tx/${executeResponse.signature}`);
        }

        return { success: true };
    } catch (error) {
        console.error('Error during swap:', error);
        
        return { success: false, error: error.message };
    }
}