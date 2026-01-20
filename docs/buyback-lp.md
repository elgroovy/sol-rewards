# Auto Buyback & LP

<figure><img src=".gitbook/assets/buyback-lp.png" alt="" width="375"><figcaption></figcaption></figure>

## How Auto Buyback & LP Works

The buyback system uses **2% of all trading volume** to automatically buy back tokens and add liquidity to the pool. This creates constant buy pressure and deepens liquidity over time.

***

### The Process

**Step 1: Collect funds**

The buyback wallet accumulates SOL from 2% of all trading volume.

**Step 2: Split 50/50**

When the system runs, it splits the available SOL into two equal parts:
* **50%** → Used to buy tokens from the market
* **50%** → Reserved for pairing with the bought tokens

**Step 3: Buy tokens**

The first half of SOL is used to purchase tokens on a decentralized exchange. This creates buy pressure and helps support the token price.

**Step 4: Add liquidity**

The purchased tokens are paired with the remaining SOL and added to the liquidity pool on Meteora. This:
* Deepens the liquidity pool
* Reduces price impact on trades
* Locks value into the ecosystem

***

### Why This Matters

| Benefit | How It Helps |
| ------- | ------------ |
| **Buy pressure** | Constant buying from the market supports price |
| **Deeper liquidity** | Larger trades have less price impact |
| **Permanent LP** | Liquidity is added, not removed — it compounds over time |

***

### Frequency

* The system checks every **30 minutes**
* Minimum balance required: **0.01 SOL** (to cover transaction fees)
* Buyback only runs if there's enough SOL to make it worthwhile

***

### Notifications

After each buyback cycle, a notification is sent to Telegram showing:
* How much SOL was used for the buyback
* How many tokens were purchased
* How much liquidity was added
* A link to verify the transaction on Solscan

***

### Summary

| Setting | Value |
| ------- | ----- |
| Funding source | 2% of trading volume |
| Buyback/LP split | 50% / 50% |
| Check frequency | Every 30 minutes |
| Liquidity pool | Meteora DAMM v2 |

***

**In short:** 2% of every trade automatically buys back tokens and adds them as permanent liquidity — creating sustained buy pressure and a deeper pool over time.
