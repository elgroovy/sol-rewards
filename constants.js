
export const Constants = {
    kSolanaNetwork : "mainnet-beta",
    kHeliusRPCEndpoint : "https://mainnet.helius-rpc.com/?api-key=fd4ac0ba-d60e-4b97-b121-22141efc9c16",
    kHeliusDevnetRPCEndpoint : "https://devnet.helius-rpc.com/?api-key=fd4ac0ba-d60e-4b97-b121-22141efc9c16",

    kBackendUrl: "http://localhost:3000", // "http://ec2-3-121-42-215.eu-central-1.compute.amazonaws.com:3000",

    kRaydiumVaultAuthority2: "GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL",

    kTokenMintPubkey : "LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST",
    
    kFeeRecipientWalletKeyFile : "~/sol-rewards/keys/nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES.json",
    kFeeRecipientWalletPubkey : "nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES",
    
    kTreasuryWalletPubkey : "LKN4hxQh8whrWxC6jG9zHiC3dEP8F8Qus4D9ykkTREA",
    kBurnWalletPubkey : "M7HR93zu4ToKFeAzpta96S1mpC2KJu9o2fXZhjtBURN",

    kJackpotWalletKeyFile : "~/sol-rewards/keys/RLmJJDUq92SpsbqAXu5HjnMk8qW5KpuNiC6AHxBJACK.json",
    kJackpotWalletPubKey : "RLmJJDUq92SpsbqAXu5HjnMk8qW5KpuNiC6AHxBJACK",

    kTokenDecimals: 6,

    // Reward distribution settings
    kMinWithheldBalance : 0.1,      // Minimum witheld balance to withdraw for rewards
    kTokensToAccumulate : 10000,    // Start distributing rewards when this amount of tokens is accumulated
    kTreasuryPercent : 30,          // This results in 3% for treasury and the rest (7%) for holders and burned
    kBurnPercent : 0,               // Burns are disabled for now
    kSolToReserve: 0.1,             // 0.1 SOL to reserve for fees
    kSolMinLimit : 0.001,           // 0.001 SOL is the minimum we can send to a holder, to save on TX fees
    kBatchSize : 10,                // Number of holders to send rewards to in one batch
    kSwapSlippage : 50,             // 0.5% slippage

    // Jackpot settings
    kJackpotThreshold : 1,          // 1 SOL
    kJackpotDrawInterval : 10,      // 10 minutes
    kOldHoldersShare : 0.2,         // 20% of the jackpot goes to old holders
    kNewHoldersShare : 0.8,         // 80% of the jackpot goes to new holders
};
