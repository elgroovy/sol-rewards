
export const TokenConfig = {
    kSolanaNetwork : "devnet",

    // Token metadata
    kName: "BBB Test Token",
    kSymbol: "BBB",
    kDescription: "This is just another BBB test token",
    kMetadataUri: "https://example.com/metadata.json",

    kInitialSupply: 1_000_000_000,
    kDecimals: 6,
    
    kTransferFeeBasisPoints: 100, // 1% fee
    kTransferFeeMaxAmount: BigInt(1_000_000_000 * 10 ** 6), // is multiplied by 10 ^ kDecimals

    kEnableFreezeAuthority: false,
    
    kTokenMintKeypair : "~/sol-rewards/keys/mint-key.json",
    kOwnerWalletKeyFile: "~/sol-rewards/keys/zVioKp1fSEQk65UCUQE1nr7fsqmpE3ZLehy7pxBS14D.json",
    kFeeRecipientPubkey : "4mVP8EgT1XtPmcxsiyxusg7oYyfC8DtN8JByByxzKKyo"
};
