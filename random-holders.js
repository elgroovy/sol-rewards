import {
    Connection,
    PublicKey,
    Keypair,
    Transaction,
    SystemProgram
} from "@solana/web3.js"; 

import {
    Token,
    TOKEN_PROGRAM_ID
} from '@solana/spl-token';

import fs from "fs";

/*
 * Main function to distribute tokens to random holders.
 * Usage: node random-holders.js <holderCount> <ownerKeypairPath> <tokenMintAddress> <amount>
 */
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 4) {
        console.error('Usage: node random-holders.js <holderCount> <ownerKeypairPath> <tokenMintAddress> <amount>');
        process.exit(1);
    }

    const [holderCount, ownerKeypairPath, tokenMintAddress, amount] = args;
    const connection = new Connection(clusterApiUrl(Constants.kSolanaNetwork), "confirmed");
    const ownerKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(ownerKeypairPath, 'utf8'))));
    const mintPublicKey = new PublicKey(tokenMintAddress);
    const token = new Token(connection, mintPublicKey, TOKEN_PROGRAM_ID, ownerKeypair);

    for (let i = 0; i < holderCount; i++) {
        const newAccount = Keypair.generate();
        const associatedTokenAddress = await token.getOrCreateAssociatedAccountInfo(newAccount.publicKey);

        const transaction = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: ownerKeypair.publicKey,
                newAccountPubkey: newAccount.publicKey,
                lamports: await connection.getMinimumBalanceForRentExemption(165),
                space: 165,
                programId: TOKEN_PROGRAM_ID,
            }),
            Token.createInitAccountInstruction(
                TOKEN_PROGRAM_ID,
                mintPublicKey,
                associatedTokenAddress.address,
                newAccount.publicKey
            ),
            Token.createTransferInstruction(
                TOKEN_PROGRAM_ID,
                await token.getOrCreateAssociatedAccountInfo(ownerKeypair.publicKey).address,
                associatedTokenAddress.address,
                ownerKeypair.publicKey,
                [],
                amount
            )
        );

        await connection.sendTransaction(transaction, [ownerKeypair, newAccount], { skipPreflight: false, preflightCommitment: 'confirmed' });
        console.log(`Created account ${newAccount.publicKey.toBase58()} and deposited ${amount} tokens`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});