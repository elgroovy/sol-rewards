import {
    clusterApiUrl,
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction
} from "@solana/web3.js";

import {
    ExtensionType,
    getMintLen,
    createInitializeTransferFeeConfigInstruction,
    createInitializeMintInstruction,
    decodeInitializeMintInstruction,
    createInitializeMetadataPointerInstruction,
    TYPE_SIZE,
    LENGTH_SIZE,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";

import { createInitializeInstruction, pack } from "@solana/spl-token-metadata";

import { TokenConfig } from './token-config.js';
import { loadKeypairFromFile } from "../keypair-utils.js";


async function main() {
    // Load token mint, owner/payer and fee recipient keypairs
    let ownerPayerKeypair, tokenMintKeypair;
    try {
        ownerPayerKeypair = await loadKeypairFromFile(TokenConfig.kOwnerWalletKeyFile);
        tokenMintKeypair = await loadKeypairFromFile(TokenConfig.kTokenMintKeypair);
    } catch (error) {
        console.error("Failed to load the keypair:", error);
        return;
    }
    
    // Metadata to store in Mint Account
    const metaData = {
        updateAuthority: ownerPayerKeypair.publicKey,
        mint: tokenMintKeypair.publicKey,
        name: TokenConfig.kName,
        symbol: TokenConfig.kSymbol,
        uri: TokenConfig.kMetadataUri,
        additionalMetadata: [["description", TokenConfig.kDescription]],
    };

    // Size of MetadataExtension 2 bytes for type, 2 bytes for length, plus the actual struct
    const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length;

    try {
        console.log("Minting token...");

        // Connection to the cluster
        const connection = new Connection(clusterApiUrl(TokenConfig.kSolanaNetwork), "confirmed");

        const feeRecipient = new PublicKey(TokenConfig.kFeeRecipientPubkey);
        
        const extensions = [ExtensionType.TransferFeeConfig, ExtensionType.MetadataPointer];
        const mintLength = getMintLen(extensions);
        
        const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLength + metadataLen);
        
        const createAccountInstruction = SystemProgram.createAccount({
            fromPubkey: ownerPayerKeypair.publicKey,
            newAccountPubkey: tokenMintKeypair.publicKey,
            space: mintLength,
            lamports: mintLamports,
            programId: TOKEN_2022_PROGRAM_ID,
        });
        
        const initializeTransferFeeConfigInstruction = createInitializeTransferFeeConfigInstruction(
            tokenMintKeypair.publicKey,
            ownerPayerKeypair.publicKey,
            feeRecipient,
            TokenConfig.kTransferFeeBasisPoints,
            TokenConfig.kTransferFeeMaxAmount,
            TOKEN_2022_PROGRAM_ID,
        );

        // Instruction to initialize the MetadataPointer Extension
        const initializeMetadataPointerInstruction = createInitializeMetadataPointerInstruction(
            tokenMintKeypair.publicKey,
            ownerPayerKeypair.publicKey, // authority that can update the metadata
            tokenMintKeypair.publicKey, // account address that holds the metadata
            TOKEN_2022_PROGRAM_ID,
        );
        
        const initializeMintInstruction = createInitializeMintInstruction(
            tokenMintKeypair.publicKey,
            TokenConfig.kDecimals,
            ownerPayerKeypair.publicKey,
            TokenConfig.kEnableFreezeAuthority ? ownerPayerKeypair.publicKey : null,
            TOKEN_2022_PROGRAM_ID,
        );

        // Instruction to initialize Metadata Account data
        const initializeMetadataInstruction = createInitializeInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: tokenMintKeypair.publicKey,
            updateAuthority: ownerPayerKeypair.publicKey,
            mint: tokenMintKeypair.publicKey,
            mintAuthority: ownerPayerKeypair.publicKey,
            name: metaData.name,
            symbol: metaData.symbol,
            uri: metaData.uri,
        });
        
        const mintTransaction = new Transaction().add(
            createAccountInstruction,
            initializeTransferFeeConfigInstruction,
            initializeMetadataPointerInstruction,
            initializeMintInstruction,
            initializeMetadataInstruction
        );
        
        const signature = await sendAndConfirmTransaction(
            connection,
            mintTransaction,
            [ownerPayerKeypair, tokenMintKeypair],
            { commitment: "finalized" },
        );
        
        console.log(`Token minted successfully. Signature: https://solscan.io/tx/${signature}?cluster=${TokenConfig.kSolanaNetwork}`);
    } catch (error) {
        console.error("An error occurred while minting token:", error);
    }
}

await main();