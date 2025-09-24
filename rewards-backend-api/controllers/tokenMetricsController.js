const { Connection, PublicKey } = require('@solana/web3.js');
const { Constants } = require('../../constants');
const fetch = require('node-fetch');

const DEXSCREENER_API_URL = "https://api.dexscreener.com/latest/dex/pairs/solana/2hDES5rJLmoANB9HjSKffFx62pCiqRfi5Q86cPTCkJeF";

const getTokenMetrics = async (req, res) => {
    try {
        const connection = new Connection(Constants.kHeliusRPCEndpoint);
        const tokenMintPublicKey = new PublicKey(Constants.kTokenMintPubkey);

        // Fetch token supply
        const supplyInfo = await connection.getTokenSupply(tokenMintPublicKey);
        const supply = supplyInfo.value.uiAmount;

        // Total tax is 10%
        const totalTax = 0.10;
        
        // kLotteryPercent and kTreasuryPercent define the allocation percentages of the TOTAL TAX
        const lotteryAllocation = Constants.kLotteryPercent;
        const treasuryAllocation = Constants.kTreasuryPercent;

        // Calculate the percentage of the total tax that goes to holders
        const holdersAllocationPercentageOfTotalTax = 100 - lotteryAllocation - treasuryAllocation;

        // Calculate the actual fee for holders as an integer in basis points to avoid floating-point issues
        const fee = totalTax * (holdersAllocationPercentageOfTotalTax / 100); // e.g. 0.10 * 0.70 = 0.07 (7%)

        // Fetch volume from Dexscreener
        const dexScreenerRes = await fetch(DEXSCREENER_API_URL);
        if (!dexScreenerRes.ok) {
            throw new Error(`Dexscreener API HTTP error! status: ${dexScreenerRes.status}`);
        }
        const dexScreenerData = await dexScreenerRes.json();
        
        let volume = 0;
        if (dexScreenerData.pairs && dexScreenerData.pairs.length > 0) {
            volume = dexScreenerData.pairs[0].volume.h24;
        }

        const tokenData = {
            volume: volume,
            supply: supply,
            fee: fee,
            lastUpdated: new Date().toISOString()
        };
        res.status(200).json(tokenData);
    } catch (error) {
        console.error("Error fetching token data:", error);
        res.status(500).json({ success: false, error: "Failed to fetch token data." });
    }
};

module.exports = {
    getTokenMetrics
};