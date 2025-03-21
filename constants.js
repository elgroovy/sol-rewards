
export const Constants = {
    kSolanaNetwork : "mainnet-beta",
    kHeliusRPCEndpoint : "https://mainnet.helius-rpc.com/?api-key=fd4ac0ba-d60e-4b97-b121-22141efc9c16",

    kNotificationServerUrl: "http://ec2-3-121-42-215.eu-central-1.compute.amazonaws.com:3000/api/rewardnotis",

    kRaydiumVaultAuthority2: "GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL",

    kTokenMintPubkey : "LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST",
    kFeeRecipientWalletKeyFile : "~/sol-rewards/keys/nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES.json",
    
    kTreasuryWalletPubkey : "LKN4hxQh8whrWxC6jG9zHiC3dEP8F8Qus4D9ykkTREA",
    kBurnWalletPubkey : "M7HR93zu4ToKFeAzpta96S1mpC2KJu9o2fXZhjtBURN",

    kTokenDecimals: 6,

    // Reward distribution settings
    kTokensToAccumulate : 10000,    // Start distributing rewards when this amount of tokens is accumulated
    kTreasuryPercent : 22.2,        // This results in 2% for treasury and the rest (8%) for holders and burned
    kBurnPercent : 10,              // 10% of tokens (fees) is burnt initially
    kSolToReserve: 0.1,             // 0.1 SOL to reserve for fees
    kSolMinLimit : 0.001,           // 0.001 SOL is the minimum we can send to a holder, to save on TX fees
    kBatchSize : 10,                // Number of holders to send rewards to in one batch
    kSwapSlippage : 50,             // 0.5% slippage
};
