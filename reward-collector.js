import {
    Connection,
    PublicKey,
    clusterApiUrl,
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

import { loadKeypairFromFile } from "./keypair-utils.js";
import { Constants } from './constants.js';

let ownerKeypair = null;

/**
 * Main function to withdraw withheld fees from token accounts.
 * It connects to the Solana cluster, retrieves token accounts, checks for withheld fees,
 * and withdraws them to a specified destination account.
 */
async function collectFees() {
  console.log("---------------------------------");

  const mint = new PublicKey(Constants.kTokenMintPubkey); 
  
  // Connection to the cluster
  const connection = new Connection(/*clusterApiUrl(Constants.kSolanaNetwork)*/Constants.kHeliusRPCEndpoint, "confirmed");
  
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
  
  if (accountsToWithdrawFrom.length > 0) {
  
    const payer = ownerKeypair;
    const withdrawWithheldAuthority = ownerKeypair;
    const destinationWallet = ownerKeypair.publicKey;

    try {
  
      // Get the token account of the destinationAccount Solana address, if it does not exist, create it
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
  
      // Withdraw withheld tokens from Token Accounts
      const transactionSignature = await withdrawWithheldTokensFromAccounts(
        connection,
        payer,
        mint,
        destinationTokenAccount.address, // destination account for fee withdrawal
        withdrawWithheldAuthority, // authority for fee withdrawal
        [], // additional signers (empty array)
        accountsToWithdrawFrom,
        undefined, // confirmation options
        TOKEN_2022_PROGRAM_ID,
      );

      // TODO: attempt to withdraw withheld tokens to the Mint account as well.
      // See withdrawWithheldTokensFromMint and harvestWithheldTokensToMint functions.
  
      console.log(
          `Successfully retrieved withheld tokens:`,
          `https://solscan.io/tx/${transactionSignature}?cluster=${Constants.kSolanaNetwork}`,
      );
    } catch (error) {
      if (error instanceof SendTransactionError) {
        console.error("Transaction failed:", error.message);
      } else {
        console.error("An unexpected error occurred:", error);
      }
    }
  }
  else {
      console.log("No withheld tokens found!");
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
await collectFees().catch(console.error);

// Run it every X minutes
setInterval(() => {
  collectFees().catch(console.error);
}, 300000); // 300000 milliseconds = 5 minutes

// Keep the application running
process.stdin.resume();