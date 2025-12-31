
export const Constants = {
    kSolanaNetwork : "mainnet-beta",
    kHeliusRPCEndpoint : "https://mainnet.helius-rpc.com/?api-key=fd4ac0ba-d60e-4b97-b121-22141efc9c16",
    kHeliusDevnetRPCEndpoint : "https://devnet.helius-rpc.com/?api-key=fd4ac0ba-d60e-4b97-b121-22141efc9c16",

    kBackendUrl: "https://api.testrewardstoken.com" /*"http://localhost:3000"*/,

    kWSOLMint: "So11111111111111111111111111111111111111112",

    kRaydiumVaultAuthority2: "GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL",
    kMeteoraMainTRTWSOLDAMMPool: "5nWp6AzuuXqVMhSAPBrxn6hA5QgmVGF3H3XHDBRvZKA5",
    kMeteoraTRTWSOLPool: "7rC3Uo1A7wLQDhxbAzpFxeLi7yHKYQh5odLbDNZjPYU",

    kTokenMintPubkey : "LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST",
    
    kFeeRecipientWalletKeyFile : "~/Documents/Projects/sol-rewards/keys/nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES.json",
    kFeeRecipientWalletPubkey : "nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES",
    
    kTreasuryWalletKeyFile : "~/Documents/Projects/sol-rewards/keys/LKN4hxQh8whrWxC6jG9zHiC3dEP8F8Qus4D9ykkTREA.json",
    kTreasuryWalletPubkey : "LKN4hxQh8whrWxC6jG9zHiC3dEP8F8Qus4D9ykkTREA",

    kBurnWalletPubkey : "M7HR93zu4ToKFeAzpta96S1mpC2KJu9o2fXZhjtBURN",

    kJackpotWalletKeyFile : "~/Documents/Projects/sol-rewards/keys/RLmJJDUq92SpsbqAXu5HjnMk8qW5KpuNiC6AHxBJACK.json",
    kJackpotWalletPubKey : "RLmJJDUq92SpsbqAXu5HjnMk8qW5KpuNiC6AHxBJACK",
    
    kBuybackWalletKeyFile : "~/Documents/Projects/sol-rewards/keys/gBzAZimUfgNm7LdbiWwcg8o41iefYtVexHTiadnBUYB.json",
    kBuybackWalletPubkey : "gBzAZimUfgNm7LdbiWwcg8o41iefYtVexHTiadnBUYB",
    
    // Disable token rewards, use SOL instead
    kRewardTokenMintPubkey : "",
    kRewardTokenDecimals : 9,
    kRewardTokenSymbol : "",

    kTokenDecimals: 6,

    // Reward distribution settings
    kMinWithheldBalance : 0.1,      // Minimum witheld balance to withdraw for rewards
    kTokensToAccumulate : 10000,    // Start distributing rewards when this amount of tokens is accumulated
    kRewardMinHolding : 100_000,    // 100,000 tokens for rewards eligibility
    kLotteryPercent : 30,           // 3% of the rewards go to the jackpot
    kTreasuryPercent : 20,          // 2% for treasury and the rest (5%) for holders
    kBurnPercent : 0,               // Burns are disabled for now
    kSolToReserve: 0.1,             // 0.1 SOL to reserve for fees
    kSolMinLimit : 0.00005,         // 0.00005 SOL is the minimum we can send to a holder, to save on TX fees
    kBatchSize : 10,                // Number of holders to send rewards to in one batch
    
    // Buyback settings
    kBuybackSolToReserve: 0.01,     // 0.01 SOL to reserve for fees
    kBuybackTokenAccount: "9RQPZTRMcaskfFUgvW71aFBsxxX1zovAMJSZbev9jYFZ",

    // Jackpot settings
    kJackpotThreshold : 0.2,                    // 0.2 SOL
    kJackpotTokensToAccumulate: 100,            // 100 tokens
    kJackpotEligibilityMinHolding : 100_000,    // 100,000 tokens
    kJackpotCheckInterval : 30,                 // 30 minutes
    kTreasuryShareOfJackpot: 0.6,               // 60% of the treasury goes to the jackpot
    kOldHoldersShare : 0.2,                     // 20% of the jackpot goes to old holders
    kNewHoldersShare : 0.5                      // 50% of the jackpot goes to new holders
};
