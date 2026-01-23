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

<table><thead><tr><th width="280.0703125">Property</th><th>Value</th></tr></thead><tbody><tr><td><strong>Name</strong></td><td>Test Rewards Token</td></tr><tr><td><strong>Symbol</strong></td><td>TRT</td></tr><tr><td><strong>Network</strong></td><td>Solana (Mainnet)</td></tr><tr><td><strong>Token Standard</strong></td><td>SPL Token-2022</td></tr><tr><td><strong>Decimals</strong></td><td>6</td></tr><tr><td><strong>Contract Address</strong></td><td><a href="https://solscan.io/account/LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST?cluster=mainnet-beta">LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST</a></td></tr><tr><td><strong>Launch Date</strong></td><td>March 2025</td></tr></tbody></table>

***

### Supply

<table><thead><tr><th width="280.0390625">Metric</th><th>Amount</th></tr></thead><tbody><tr><td><strong>Initial Supply</strong></td><td>1,000,000,000 TRT</td></tr><tr><td><strong>Current Supply</strong></td><td>~825,313,377 TRT</td></tr><tr><td><strong>Burned</strong></td><td>~174,686,623 TRT (~17.5%)</td></tr></tbody></table>

The token launched with 1 billion tokens. Through a series of community burn campaigns, approximately 17.5% of the supply has been permanently destroyed, making TRT a deflationary asset.

***

### Initial Distribution

At launch, the token supply was allocated as follows:

| Allocation             | Percentage | Amount          | Description                                                     |
| ---------------------- | ---------- | --------------- | --------------------------------------------------------------- |
| **Public Presale**     | 50%        | 500,000,000 TRT | Distributed to early supporters based on their SOL contribution |
| **Initial Liquidity**  | 10%        | 100,000,000 TRT | Paired with 2.20 SOL for initial trading liquidity              |
| **Team & Operations**  | 40%        | 400,000,000 TRT | Retained for ongoing development, operations, OTC buy campaigns, burn events, and future needs  |

#### Presale Details

The presale raised approximately 3 SOL. This was intentionally kept small as TRT started as a live test of the reward mechanism. Tokens were distributed proportionally to each participant based on their SOL contribution.

#### Liquidity Growth

The second day after launch, liquidity was significantly increased through an injection of approximately 25M TRT paired with 25 SOL. Many months later, the automated buyback system was introduced, which continuously adds tokens and SOL to the liquidity pool. See [Auto Buyback & LP](buyback-lp.md) for details on how this works.

***

### Transaction Tax

Every buy, sell, and transfer incurs a **10% tax**. This tax is automatically collected using Solana's Token-2022 transfer fee extension - no external contracts or manual intervention required.

#### Tax Distribution

The collected tax is converted to SOL and split as follows: **5%** to holder rewards, **3%** to jackpot, **2%** to buyback & LP. See [Rewards](rewards.md), [Lottery](lottery.md), and [Auto Buyback & LP](buyback-lp.md) for details.

***

### Deflationary Mechanisms

TRT is designed to become scarcer over time through multiple mechanisms:

| Mechanism           | Status     | Description                                      |
| ------------------- | ---------- | ------------------------------------------------ |
| **Automatic Burns** | ⏸️ Planned | Will be enabled when liquidity targets are met   |
| **Buyback & Lock**  | ✅ Active   | Bought tokens are added to permanently locked LP |

***

### Deployer Wallet

<table><thead><tr><th width="109.62109375">Wallet</th><th width="429.64453125">Address</th><th>Purpose</th></tr></thead><tbody><tr><td><strong>Deployer</strong></td><td><a href="https://solscan.io/account/zVioKp1fSEQk65UCUQE1nr7fsqmpE3ZLehy7pxBS14D?cluster=mainnet-beta">zVioKp1fSEQk65UCUQE1nr7fsqmpE3ZLehy7pxBS14D</a></td><td>Token deployment and initial distribution</td></tr></tbody></table>

***

### System Wallets

The protocol uses four dedicated wallets for ongoing operations, each with a custom vanity address for easy identification:

<table><thead><tr><th width="110.359375">Wallet</th><th width="429.56640625">Address</th><th>Purpose</th></tr></thead><tbody><tr><td><strong>Rewards</strong></td><td><a href="https://solscan.io/account/nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES?cluster=mainnet-beta">nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES</a></td><td>Collects and distributes holder rewards</td></tr><tr><td><strong>Jackpot</strong></td><td><a href="https://solscan.io/account/RLmJJDUq92SpsbqAXu5HjnMk8qW5KpuNiC6AHxBJACK?cluster=mainnet-beta">RLmJJDUq92SpsbqAXu5HjnMk8qW5KpuNiC6AHxBJACK</a></td><td>Holds funds for lottery draws</td></tr><tr><td><strong>Treasury</strong></td><td><a href="https://solscan.io/account/LKN4hxQh8whrWxC6jG9zHiC3dEP8F8Qus4D9ykkTREA?cluster=mainnet-beta">LKN4hxQh8whrWxC6jG9zHiC3dEP8F8Qus4D9ykkTREA</a></td><td>Project development and operations</td></tr><tr><td><strong>Buyback</strong></td><td><a href="https://solscan.io/account/gBzAZimUfgNm7LdbiWwcg8o41iefYtVexHTiadnBUYB?cluster=mainnet-beta">gBzAZimUfgNm7LdbiWwcg8o41iefYtVexHTiadnBUYB</a></td><td>Executes buybacks and LP injection</td></tr></tbody></table>

***

### Eligibility Requirements

| Feature             | Minimum Holding |
| ------------------- | --------------- |
| Holder Rewards      | 100,000 TRT     |
| Jackpot Eligibility | 100,000 TRT     |

***

### Summary

TRT combines automatic rewards, gamified jackpots, and sustainable tokenomics into a single ecosystem. The 10% tax funds continuous value return to holders while buybacks and burns create long-term deflationary pressure. No staking complexity, no manual claims - just hold and earn.
