
export const Constants = {
    kSolanaNetwork : "mainnet-beta", //"devnet",
    kTokenMintPubkey : "147Eqgkkmesmzb3JwfrigVDk6hhJP7N2eENrzqreTEST",
    kFeeRecipientWalletKeyFile : "~/sol-rewards/keys/nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES.json",
    kTreasuryWalletPubkey : "LKN4hxQh8whrWxC6jG9zHiC3dEP8F8Qus4D9ykkTREA",

    kTokenDecimals: 6,

    // Reward distribution settings
    kTokensToAccumulate : 10000,    // Start distributing rewards when this amount of tokens is accumulated
    kTreasuryPercent : 50,          // 50% of fees goes to treasury (the rest goes to holders and burnt)
    kBurnPercent : 10,              // 10% of fees is burnt
    kSolToReserve: 0.1,             // 0.1 SOL to reserve for fees
    kSolMinLimit : 0.001,           // 0.001 SOL is the minimum we can send to a holder, to save on TX fees
    kBatchSize : 10,                // Number of holders to send rewards to in one batch
    kSwapSlippage : 50,             // 0.5% slippage
};
