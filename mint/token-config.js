
export const TokenConfig = {
    kSolanaNetwork : "mainnet-beta", //"devnet",

    // Token metadata
    kName: "Test Rewards Token",
    kSymbol: "TRT",
    kDescription: "A token that takes a little off the top, because who doesn't love a good tax?",
    kMetadataUri: "https://ipfs.io/ipfs/bafkreigclalfn7qjhlfdzl2bph7ndydx4hre44dwjxxgaqwkdzo4lreeqm",

    kInitialSupply: 1_000_000_000,
    kDecimals: 6,
    
    kTransferFeeBasisPoints: 1000, // 10% fee
    kTransferFeeMaxAmount: BigInt(1_000_000_000 * 10 ** 6), // is multiplied by 10 ^ kDecimals

    kEnableFreezeAuthority: false,
    
    kTokenMintKeypair : "~/sol-rewards/keys/LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST.json",
    kOwnerWalletKeyFile: "~/sol-rewards/keys/zVioKp1fSEQk65UCUQE1nr7fsqmpE3ZLehy7pxBS14D.json",
    kFeeRecipientPubkey : "nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES"
};
