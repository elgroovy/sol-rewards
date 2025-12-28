import {
    Connection,
    PublicKey,
    SendTransactionError
} from "@solana/web3.js";
import {
    TOKEN_2022_PROGRAM_ID,
    getTransferFeeAmount,
    harvestWithheldTokensToMint,
    unpackAccount,
    withdrawWithheldTokensFromAccounts,
    withdrawWithheldTokensFromMint,
    getOrCreateAssociatedTokenAccount
} from "@solana/spl-token";

import { Constants } from './constants.js';

let ownerKeypair = null;

/**
 * Collects withheld fees from token accounts and withdraws them to the specified destination.
 * @param {Connection} connection - Solana connection instance
 * @param {Keypair} ownerKeypair - The keypair with authority to collect fees
 * @returns {Promise<Object>} Result object with success status and collected amount
 */
export async function collectFees(connection, ownerKeypair) {
  const mint = new PublicKey(Constants.kTokenMintPubkey); 
  
  // Retrieve all Token Accounts for the Mint Account
  const allAccounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
      commitment: "confirmed",
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: mint.toString(), // Mint Account address
          },
        },
      ],
    });
  
  // List of Token Accounts to withdraw fees from
  const accountsToWithdrawFrom = [];
  let totalFees = BigInt(0);
  
  for (const accountInfo of allAccounts) {
    const account = unpackAccount(
      accountInfo.pubkey, // Token Account address
      accountInfo.account, // Token Account data
      TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
    );
  
    // Extract transfer fee data from each account
    const transferFeeAmount = getTransferFeeAmount(account);
  
    // Check if fees are available to be withdrawn
    if (transferFeeAmount !== null && transferFeeAmount.withheldAmount > BigInt(0)) {
      //console.log(`Found wallet with withheld fee: ${transferFeeAmount.withheldAmount}`);
      totalFees += transferFeeAmount.withheldAmount;
      accountsToWithdrawFrom.push(accountInfo.pubkey); // Add account to withdrawal list
    }
  }

  const totalFeesInTokens = Number(totalFees) / Math.pow(10, Constants.kTokenDecimals);
  console.log(`Found ${accountsToWithdrawFrom.length} account(s) we can collect the fees from. ${totalFeesInTokens} tokens in total:`);
  for (const account of accountsToWithdrawFrom) {
    console.log(account.toBase58());
  }

  if (accountsToWithdrawFrom.length === 0) {
    console.log("No withheld tokens found!");
    return { success: true, collected: 0, accountsProcessed: 0 };
  }

  try {
    const payer = ownerKeypair;
    const withdrawWithheldAuthority = ownerKeypair;
    const destinationWallet = ownerKeypair.publicKey;

    // Get the token account of the destination, if it does not exist, create it
    const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      destinationWallet,
      true,
      "finalized",
      { commitment: "finalized" }, // Confirmation options
      TOKEN_2022_PROGRAM_ID,
    );

    const signatures = [];

    // Withdraw withheld tokens from Token Accounts.
    // Do this in batches to make sure we don't hit the Solana transaction size limit of 1232 bytes 
    for (let i = 0; i < accountsToWithdrawFrom.length; i += Constants.kBatchSize) {
      const currentAccountsBatch = accountsToWithdrawFrom.slice(i, i + Constants.kBatchSize);

      const transactionSignature = await withdrawWithheldTokensFromAccounts(
        connection,
        payer,
        mint,
        destinationTokenAccount.address, // destination account for fee withdrawal
        withdrawWithheldAuthority, // authority for fee withdrawal
        [], // additional signers (empty array)
        currentAccountsBatch,
        undefined, // confirmation options
        TOKEN_2022_PROGRAM_ID,
      );

      signatures.push(transactionSignature);

      // TODO: attempt to withdraw withheld tokens to the Mint account as well.
      // See withdrawWithheldTokensFromMint and harvestWithheldTokensToMint functions.
  
      console.log(
          `Retrieved withheld tokens:`,
          `https://solscan.io/tx/${transactionSignature}?cluster=${Constants.kSolanaNetwork}`,
      );
    }

    return {
      success: true,
      collected: totalFeesInTokens,
      accountsProcessed: accountsToWithdrawFrom.length,
      signatures
    };
  } catch (error) {
    if (error instanceof SendTransactionError) {
      console.error("Transaction failed:", error.message);
    } else {
      console.error("An unexpected error occurred:", error);
    }
    return { success: false, error: error.message };
  }
}
