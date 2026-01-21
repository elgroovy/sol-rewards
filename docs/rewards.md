---
cover: .gitbook/assets/trt-cover.jpeg
coverY: 0
layout:
  width: default
  cover:
    visible: true
    size: hero
  title:
    visible: true
  description:
    visible: true
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
  metadata:
    visible: true
---

# Rewards

<figure><img src=".gitbook/assets/dancing-dollar-bill.png" alt="" width="375"><figcaption></figcaption></figure>

## How the Rewards Distribution Works

### Overview

The rewards system automatically collects transaction fees from token trades and redistributes them back to the community. This creates a passive income stream for holders who meet the minimum requirements.

***

### Who Is Eligible for Rewards?

To receive rewards, you must:

* **Hold at least 100,000 tokens** in your wallet (this minimum may be adjusted as TRT grows)
* **Have some SOL in your wallet** (to ensure your wallet is active on Solana)
* **Not be a system wallet** (liquidity pools, fee accounts, and other automated wallets are excluded)

***

### How Rewards Are Collected

Every time someone buys or sells the token, a small transaction fee is collected. These fees accumulate in a dedicated wallet [**nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES**](https://solscan.io/account/nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES?cluster=mainnet-beta)

Once the accumulated fees reach **10,000 tokens**, the distribution cycle begins automatically.

***

### The Distribution Process

#### Step 1: Fee Collection

The system first sweeps any uncollected fees from across the network into the main rewards wallet.

#### Step 2: Token-to-SOL Conversion

All accumulated tokens are swapped for SOL on a decentralized exchange. This converts the fees into a currency that can be easily distributed.

#### Step 3: The Three-Way Split

The converted SOL is divided into three portions:

| Destination          | Share | Purpose                                      |
| -------------------- | ----- | -------------------------------------------- |
| **Holders**          | 50%   | Direct rewards to eligible token holders     |
| **Jackpot Fund**     | 30%   | Funds the lottery-style jackpot draws        |
| **Treasury/Buyback** | 20%   | Funds project development and token buybacks |

#### Step 4: Calculating Your Share

Your individual reward is calculated using **square root weighting**. This compresses the gap between large and small holders — whales still earn more, but smaller holders get a fairer slice of the pie.

**Example:** Two holders splitting a 1 SOL reward pool (total supply: 1 billion)

| Holder         | Tokens     | % of Supply | With Linear | With Sqrt |
| -------------- | ---------- | ----------- | ----------- | --------- |
| Large holder   | 10,000,000 | 1%          | 0.91 SOL    | 0.76 SOL  |
| Smaller holder | 1,000,000  | 0.1%        | 0.09 SOL    | 0.24 SOL  |

The large holder has 10x more tokens but only gets ~3x more rewards (instead of 10x). The difference is redistributed to the smaller holder.

Your share is based on total supply, so it stays consistent as long as your holdings don't change — new holders joining won't reduce your rewards.

#### Step 5: Batch Distribution

Because Solana has transaction size limits, rewards are sent out in batches of 10 wallets at a time. This ensures all transactions complete successfully.

***

### Pending Rewards for Small Holders

If your calculated reward for a distribution cycle is very small (below 0.00005 SOL), it won't be sent immediately — but it's **not lost**. Instead, your reward is saved and accumulates over multiple cycles.

Once your accumulated rewards reach the minimum threshold, they are automatically sent to your wallet. This ensures that even smaller holders eventually receive their fair share without being skipped entirely.

***

### Distribution Timeline

* **Cycle frequency:** Every 5 minutes, the system checks if there are enough accumulated tokens
* **Trigger threshold:** Distribution only occurs when at least 10,000 tokens have been collected
* **Delivery:** Once triggered, rewards are sent directly to your wallet — no claiming required

***

### What Gets Excluded?

The following are automatically filtered out and don't receive rewards:

* **System wallets** — Fee recipient, jackpot, buyback, and burn wallets
* **Liquidity pool vaults** — Automated market maker reserves
* **Program accounts** — Smart contract addresses
* **Wallets below minimum** — Holdings under 100,000 tokens
* **Empty wallets** — Wallets with zero SOL balance

***

### Notifications

After each distribution cycle, a notification is sent to the Telegram bot showing:

* Which wallets received rewards
* How much each wallet earned
* A link to verify the transaction on Solscan

<div align="left"><figure><img src=".gitbook/assets/rewards_notification.png" alt="" width="300"><figcaption><p>Rewards Rotification</p></figcaption></figure></div>

***

### Summary

| Setting                               | Value                                |
| ------------------------------------- | ------------------------------------ |
| Minimum holding for rewards           | 100,000 tokens                       |
| Tokens needed to trigger distribution | 10,000 tokens                        |
| Holders' share                        | 50%                                  |
| Jackpot share                         | 30%                                  |
| Treasury share                        | 20%                                  |
| Distribution model                    | Square root weighted                 |
| Distribution frequency                | Every 5 minutes (when threshold met) |

***

**In short:** Hold at least 100,000 tokens, keep some SOL in your wallet, and rewards will automatically flow to you based on square root weighting — giving smaller holders a fairer share. No staking or claiming required.

<figure><img src=".gitbook/assets/trt-notif-bot-transparent.png" alt="" width="375"><figcaption></figcaption></figure>
