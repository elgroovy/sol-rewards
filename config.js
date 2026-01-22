import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

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

    // Telegram bot settings
    telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
    rewardsTelegramBotToken: process.env.REWARDS_TELEGRAM_BOT_TOKEN || "",
    jackpotTelegramBotToken: process.env.JACKPOT_TELEGRAM_BOT_TOKEN || "",
    guruBotToken: process.env.GURU_BOT_TOKEN || "",

    // AI settings
    googleAiApiKey: process.env.GOOGLE_AI_API_KEY || "",

    // Indexer settings
    indexerIntervalMin: Number(process.env.INDEXER_INTERVAL_MIN) || 30,
};