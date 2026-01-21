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

# Tokenomics

<figure><img src=".gitbook/assets/logo-embossed.png" alt="" width="375"><figcaption></figcaption></figure>

### Token Overview

| Property             | Value                                         |
| -------------------- | --------------------------------------------- |
| **Name**             | Test Rewards Token                            |
| **Symbol**           | TRT                                           |
| **Network**          | Solana (Mainnet)                              |
| **Token Standard**   | SPL Token-2022                                |
| **Decimals**         | 6                                             |
| **Contract Address** | `LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST` |
| **Launch Date**      | March 2025                                    |

***

### Supply

| Metric             | Amount                      |
| ------------------ | --------------------------- |
| **Initial Supply** | 1,000,000,000 TRT           |
| **Current Supply** | \~825,313,377 TRT           |
| **Burned**         | \~174,686,623 TRT (\~17.5%) |

The token launched with 1 billion tokens. Through a series of community burn campaigns, approximately 17.5% of the supply has been permanently destroyed, making TRT a deflationary asset.

***

### Initial Distribution

At launch, the token supply was allocated as follows:

| Allocation             | Percentage | Amount          | Description                                                     |
| ---------------------- | ---------- | --------------- | --------------------------------------------------------------- |
| **Public Presale**     | 50%        | 500,000,000 TRT | Distributed to early supporters based on their SOL contribution |
| **Liquidity Pool**     | 30%        | 300,000,000 TRT | Paired with SOL to provide trading liquidity                    |
| **Team & Development** | 10%        | 100,000,000 TRT | Reserved for team and ongoing development                       |
| **OTC Sales**          | 10%        | 100,000,000 TRT | Sold to early believers and strategic investors                 |

#### Presale Details

Tokens were distributed proportionally based on each participant's SOL contribution — the more SOL contributed, the larger their share of the presale allocation.

***

### Transaction Tax

Every buy, sell, and transfer incurs a **10% tax**. This tax is automatically collected using Solana's Token-2022 transfer fee extension — no external contracts or manual intervention required.

#### Tax Distribution

The collected tax is converted to SOL and split as follows: **5%** to holder rewards, **3%** to jackpot, **2%** to buyback & LP. See [Rewards](rewards.md), [Lottery](lottery.md), and [Auto Buyback & LP](buyback-lp.md) for details.

***

### Deflationary Mechanisms

TRT is designed to become scarcer over time through multiple mechanisms:

| Mechanism           | Status     | Description                                                |
| ------------------- | ---------- | ---------------------------------------------------------- |
| **Automatic Burns** | ⏸️ Planned | Will be enabled when liquidity targets are met             |
| **Buyback & Lock**  | ✅ Active   | Bought tokens are added to permanently locked LP           |

***

### Deployer Wallet

<table><thead><tr><th width="119.40625">Wallet</th><th width="394.62890625">Address</th><th>Purpose</th></tr></thead><tbody><tr><td><strong>Deployer</strong></td><td><code>zVioKp1fSEQk65UCUQE1nr7fsqmpE3ZLehy7pxBS14D</code></td><td>Token deployment and initial distribution</td></tr></tbody></table>

***

### System Wallets

The protocol uses four dedicated wallets for ongoing operations, each with a custom vanity address for easy identification:

<table><thead><tr><th width="122.79296875">Wallet</th><th width="391.68359375">Address</th><th>Purpose</th></tr></thead><tbody><tr><td><strong>Rewards</strong></td><td><code>nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES</code></td><td>Collects and distributes holder rewards</td></tr><tr><td><strong>Jackpot</strong></td><td><code>RLmJJDUq92SpsbqAXu5HjnMk8qW5KpuNiC6AHxBJACK</code></td><td>Holds funds for lottery draws</td></tr><tr><td><strong>Treasury</strong></td><td><code>LKN4hxQh8whrWxC6jG9zHiC3dEP8F8Qus4D9ykkTREA</code></td><td>Project development and operations</td></tr><tr><td><strong>Buyback</strong></td><td><code>gBzAZimUfgNm7LdbiWwcg8o41iefYtVexHTiadnBUYB</code></td><td>Executes buybacks and LP injection</td></tr></tbody></table>

***

### Eligibility Requirements

| Feature             | Minimum Holding |
| ------------------- | --------------- |
| Holder Rewards      | 100,000 TRT     |
| Jackpot Eligibility | 100,000 TRT     |

***

### Summary

TRT combines automatic rewards, gamified jackpots, and sustainable tokenomics into a single ecosystem. The 10% tax funds continuous value return to holders while buybacks and burns create long-term deflationary pressure. No staking complexity, no manual claims — just hold and earn.
