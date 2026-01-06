import dotenv from 'dotenv';
dotenv.config();

export const Config = {
    heliusApiKey: process.env.HELIUS_API_KEY,
    heliusMainnetUrl: `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
    heliusDevnetUrl: `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,

    backendUrl: `${process.env.BACKEND_URL || "http://localhost:3000"}`,

    // Wallet key files
    feeRecipientKeyFile: process.env.FEE_RECIPIENT_WALLET_KEY_FILE,
    treasuryKeyFile: process.env.TREASURY_WALLET_KEY_FILE,
    jackpotKeyFile: process.env.JACKPOT_WALLET_KEY_FILE,
    buybackKeyFile: process.env.BUYBACK_WALLET_KEY_FILE,
};