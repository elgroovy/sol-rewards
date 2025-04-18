
export const Constants = {
    kSolanaNetwork : "mainnet-beta",
    kHeliusRPCEndpoint : "https://mainnet.helius-rpc.com/?api-key=fd4ac0ba-d60e-4b97-b121-22141efc9c16",
    kHeliusDevnetRPCEndpoint : "https://devnet.helius-rpc.com/?api-key=fd4ac0ba-d60e-4b97-b121-22141efc9c16",

    kBackendUrl: "http://ec2-3-121-42-215.eu-central-1.compute.amazonaws.com:3000", // "http://localhost:3000"

    kRaydiumVaultAuthority2: "GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL",

    kTokenMintPubkey : "LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST",
    
    kFeeRecipientWalletKeyFile : "~/sol-rewards/keys/nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES.json",
    kFeeRecipientWalletPubkey : "nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES",
    
    kTreasuryWalletKeyFile : "~/sol-rewards/keys/LKN4hxQh8whrWxC6jG9zHiC3dEP8F8Qus4D9ykkTREA.json",
    kTreasuryWalletPubkey : "LKN4hxQh8whrWxC6jG9zHiC3dEP8F8Qus4D9ykkTREA",

    kBurnWalletPubkey : "M7HR93zu4ToKFeAzpta96S1mpC2KJu9o2fXZhjtBURN",

    kJackpotWalletKeyFile : "~/sol-rewards/keys/RLmJJDUq92SpsbqAXu5HjnMk8qW5KpuNiC6AHxBJACK.json",
    kJackpotWalletPubKey : "RLmJJDUq92SpsbqAXu5HjnMk8qW5KpuNiC6AHxBJACK",

    kRewardTokenMintPubkey : "7dGEYMPsAVxJY3qQJaCHwLPkCCx9SSE52H4k1wF617uE",
    kRewardTokenDecimals : 9,

    kTokenDecimals: 6,

    // Reward distribution settings
    kMinWithheldBalance : 0.1,      // Minimum witheld balance to withdraw for rewards
    kTokensToAccumulate : 10000,    // Start distributing rewards when this amount of tokens is accumulated
    kJackpotPercent : 30,           // 3% of the rewards go to the jackpot
    kTreasuryPercent : 20,          // 2% for treasury and the rest (5%) for holders
    kBurnPercent : 0,               // Burns are disabled for now
    kSolToReserve: 0.1,             // 0.1 SOL to reserve for fees
    kSolMinLimit : 0.00005,         // 0.00005 SOL is the minimum we can send to a holder, to save on TX fees
    kBatchSize : 10,                // Number of holders to send rewards to in one batch
    kSwapSlippage : 50,             // 0.5% slippage

    // Jackpot settings
    kJackpotThreshold : 0.2,                    // 0.2 SOL
    kJackpotTokensToAccumulate: 100,            // 100 tokens
    kJackpotEligibilityMinHolding : 100_000,    // 100,000 tokens
    kJackpotCheckInterval : 30,                 // 30 minutes
    kTreasuryShareOfJackpot: 0.6,               // 60% of the treasury goes to the jackpot
    kOldHoldersShare : 0.2,                     // 20% of the jackpot goes to old holders
    kNewHoldersShare : 0.5,                     // 50% of the jackpot goes to new holders
    kJackpotTokenSwapSlippage : 200,             // 2.0% slippage
};
