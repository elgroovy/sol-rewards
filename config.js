import dotenv from 'dotenv';
dotenv.config();

export const Config = {
    heliusApiKey: process.env.HELIUS_API_KEY,
    heliusMainnetUrl: `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
    heliusDevnetUrl: `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,

    backendUrl: `${process.env.BACKEND_URL || "http://localhost:3000"}`

};