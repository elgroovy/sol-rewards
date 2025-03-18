
export const TokenConfig = {
    kSolanaNetwork : "devnet",

    // Token metadata
    kName: "Reward Token Test",
    kSymbol: "RTT",
    kDescription: "Reward Token Test description",
    kMetadataUri: "https://ipfs.io/ipfs/bafkreicdlzqtjt7j2qhmdajsl447vcnyusz7uug22to2j2p4cwkn56vpp4",

    kInitialSupply: 1_000_000_000,
    kDecimals: 6,
    
    kTransferFeeBasisPoints: 1000, // 10% fee
    kTransferFeeMaxAmount: BigInt(1_000_000_000 * 10 ** 6), // is multiplied by 10 ^ kDecimals

    kEnableFreezeAuthority: false,
    
    kTokenMintKeypair : "~/sol-rewards/keys/mint-key.json",
    kOwnerWalletKeyFile: "~/sol-rewards/keys/zVioKp1fSEQk65UCUQE1nr7fsqmpE3ZLehy7pxBS14D.json",
    kFeeRecipientPubkey : "4mVP8EgT1XtPmcxsiyxusg7oYyfC8DtN8JByByxzKKyo"
};
