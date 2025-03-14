
export const Constants = {
    kSolanaNetwork : "devnet",
    kTokenMintPubkey : "no3CVp5pBYZPZbJrJCLr4fKD1f6fwEsvpLW56eQibbb",
    kFeeRecipientWalletKeyFile : "~/sol-rewards/keys/fee-recipient.json",
    kTreasuryWalletPubkey : "14tobL5wspdmokchb54eWdt72tzzY4DEJxDevHR3NTRE",

    // Reward distribution settings
    kTokensToAccumulate : 10000,    // Start distributing rewards when this amount of tokens is accumulated
    kTreasuryPercent : 50,          // 50% of fees goes to treasury (the rest goes to holders and burnt)
    kBurnPercent : 10,              // 10% of fees is burnt
    kSolToReserve: 0.1,             // 0.1 SOL to reserve for fees
    kSolMinLimit : 0.001,           // 0.001 SOL is the minimum we can send to a holder, to save on TX fees
    kBatchSize : 10,                // Number of holders to send rewards to in one batch
    kSwapSlippage : 50,             // 0.5% slippage
};
