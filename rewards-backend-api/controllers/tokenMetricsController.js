import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Constants } from '../../constants.js';
import fetch from 'node-fetch';

// Weighting method for market cap and price calculations.
// 'volume': Volume-weighted average
// 'liquidity': liquidity-weighted average
const WEIGHTING_METHOD = 'liquidity'; // 'volume' | 'liquidity'
// ============================================

// API endpoint that returns all pairs for the token
const DEXSCREENER_TOKEN_API_URL = `https://api.dexscreener.com/token-pairs/v1/solana/${Constants.kTokenMintPubkey}`;

export async function getTokenMetrics(req, res) {
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

        // Calculate the actual fee for holders
        const fee = totalTax * (holdersAllocationPercentageOfTotalTax / 100);

        // Fetch all pairs from Dexscreener
        const dexScreenerRes = await fetch(DEXSCREENER_TOKEN_API_URL);
        if (!dexScreenerRes.ok) {
            throw new Error(`Dexscreener API HTTP error! status: ${dexScreenerRes.status}`);
        }
        const pairs = await dexScreenerRes.json();

        let totalVolume = 0;
        let totalLiquidity = 0;
        let marketCap = 0;
        let priceUsd = 0;

        if (Array.isArray(pairs) && pairs.length > 0) {
            // Always sum volume and liquidity across all pools
            for (const pair of pairs) {
                totalVolume += pair.volume?.h24 || 0;
                totalLiquidity += pair.liquidity?.usd || 0;
            }

            if (WEIGHTING_METHOD === 'volume') {
                // Volume-weighted calculation
                let volumeWeightedMarketCap = 0;
                let volumeWeightedPrice = 0;
                let totalVolumeForWeighting = 0;

                for (const pair of pairs) {
                    const pairVolume = pair.volume?.h24 || 0;
                    const pairMarketCap = pair.marketCap || pair.fdv || 0;
                    const pairPrice = pair.priceUsd ? parseFloat(pair.priceUsd) : 0;

                    if (pairVolume > 0) {
                        volumeWeightedMarketCap += pairMarketCap * pairVolume;
                        volumeWeightedPrice += pairPrice * pairVolume;
                        totalVolumeForWeighting += pairVolume;
                    }
                }

                if (totalVolumeForWeighting > 0) {
                    marketCap = volumeWeightedMarketCap / totalVolumeForWeighting;
                    priceUsd = volumeWeightedPrice / totalVolumeForWeighting;
                } else {
                    // Fallback to highest liquidity pool if no volume
                    const highestLiquidityPair = pairs.reduce((max, pair) => 
                        (pair.liquidity?.usd || 0) > (max.liquidity?.usd || 0) ? pair : max
                    , pairs[0]);
                    marketCap = highestLiquidityPair.marketCap || highestLiquidityPair.fdv || 0;
                    priceUsd = highestLiquidityPair.priceUsd ? parseFloat(highestLiquidityPair.priceUsd) : 0;
                }
            } else {
                // Liquidity-weighted calculation
                let liquidityWeightedMarketCap = 0;
                let liquidityWeightedPrice = 0;

                for (const pair of pairs) {
                    const pairLiquidity = pair.liquidity?.usd || 0;
                    const pairMarketCap = pair.marketCap || pair.fdv || 0;
                    const pairPrice = pair.priceUsd ? parseFloat(pair.priceUsd) : 0;

                    if (pairLiquidity > 0) {
                        liquidityWeightedMarketCap += pairMarketCap * pairLiquidity;
                        liquidityWeightedPrice += pairPrice * pairLiquidity;
                    }
                }

                if (totalLiquidity > 0) {
                    marketCap = liquidityWeightedMarketCap / totalLiquidity;
                    priceUsd = liquidityWeightedPrice / totalLiquidity;
                }
            }
        }

        // Fetch holders count.
        // First try using Helius getTokenAccounts method
        let holders = 0;
        try {
            const response = await fetch(Constants.kHeliusRPCEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getTokenAccounts',
                    params: {
                        mint: Constants.kTokenMintPubkey,
                        options: {
                            showZeroBalance: false
                        }
                    }
                })
            });

            const data = await response.json();
            
            if (data.result && data.result.token_accounts) {
                holders = data.result.token_accounts.length;
            }
        } catch (error) {
            console.error("Error fetching holders with getTokenAccounts:", error);
            
            // Fallback: Try using getProgramAccounts with correct Token-2022 account size
            try {
                const tokenAccounts = await connection.getProgramAccounts(
                    TOKEN_2022_PROGRAM_ID,
                    {
                        filters: [
                            {
                                memcmp: {
                                    offset: 0,
                                    bytes: tokenMintPublicKey.toBase58(),
                                },
                            },
                        ],
                        dataSlice: { offset: 64, length: 8 } // Only fetch the amount field
                    }
                );

                holders = tokenAccounts.filter(account => {
                    try {
                        const amount = account.account.data.readBigUInt64LE(0);
                        return amount > 0n;
                    } catch (e) {
                        return false;
                    }
                }).length;
            } catch (fallbackError) {
                console.error("Fallback holders fetch also failed:", fallbackError);
            }
        }

        const tokenData = {
            volume: totalVolume,
            supply: supply,
            fee: fee,
            liquidity: totalLiquidity,
            marketCap: marketCap,
            priceUsd: priceUsd,
            holders: holders,
            poolCount: Array.isArray(pairs) ? pairs.length : 0,
            weightingMethod: WEIGHTING_METHOD,
            lastUpdated: new Date().toISOString()
        };
        
        res.status(200).json(tokenData);
    } catch (error) {
        console.error("Error fetching token data:", error);
        res.status(500).json({ success: false, error: "Failed to fetch token data." });
    }
}