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

<table><thead><tr><th width="249.54296875">Property</th><th>Value</th></tr></thead><tbody><tr><td><strong>Name</strong></td><td>Test Rewards Token</td></tr><tr><td><strong>Symbol</strong></td><td>TRT</td></tr><tr><td><strong>Network</strong></td><td>Solana (Mainnet)</td></tr><tr><td><strong>Token Standard</strong></td><td>SPL Token-2022</td></tr><tr><td><strong>Decimals</strong></td><td>6</td></tr><tr><td><strong>Contract Address</strong></td><td><a href="https://solscan.io/account/LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST?cluster=mainnet-beta">LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST</a></td></tr><tr><td><strong>Launch Date</strong></td><td>March 2025</td></tr></tbody></table>

***

### Supply

<table><thead><tr><th width="249.8515625">Metric</th><th>Amount</th></tr></thead><tbody><tr><td><strong>Initial Supply</strong></td><td>1,000,000,000 TRT</td></tr><tr><td><strong>Current Supply</strong></td><td>~825,313,377 TRT</td></tr><tr><td><strong>Burned</strong></td><td>~174,686,623 TRT (~17.5%)</td></tr></tbody></table>

The token launched with 1 billion tokens. Through a series of community burn campaigns, approximately 17.5% of the supply has been permanently destroyed, making TRT a deflationary asset.

***

### Initial Distribution

At launch, the token supply was allocated as follows:

<table><thead><tr><th width="198.734375">Allocation</th><th width="123.39453125">Percentage</th><th width="183.62109375">Amount</th><th>Description</th></tr></thead><tbody><tr><td><strong>Public Presale</strong></td><td>50%</td><td>500,000,000 TRT</td><td>Distributed to early supporters based on their SOL contribution</td></tr><tr><td><strong>Liquidity Pool</strong></td><td>30%</td><td>300,000,000 TRT</td><td>Paired with SOL to provide trading liquidity</td></tr><tr><td><strong>Team &#x26; Development</strong></td><td>10%</td><td>100,000,000 TRT</td><td>Reserved for team and ongoing development</td></tr><tr><td><strong>OTC Sales</strong></td><td>10%</td><td>100,000,000 TRT</td><td>Sold to early believers and strategic investors</td></tr></tbody></table>

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

<table><thead><tr><th width="207.98046875">Mechanism</th><th width="142.46875">Status</th><th>Description</th></tr></thead><tbody><tr><td><strong>Automatic Burns</strong></td><td>⏸️ Planned</td><td>Will be enabled when liquidity targets are met</td></tr><tr><td><strong>Buyback &#x26; Lock</strong></td><td>✅ Active</td><td>Bought tokens are added to permanently locked LP</td></tr></tbody></table>

***

### Deployer Wallet

<table><thead><tr><th width="107.1328125">Wallet</th><th width="440.19921875">Address</th><th>Purpose</th></tr></thead><tbody><tr><td><strong>Deployer</strong></td><td><a href="https://solscan.io/account/zVioKp1fSEQk65UCUQE1nr7fsqmpE3ZLehy7pxBS14D?cluster=mainnet-beta">zVioKp1fSEQk65UCUQE1nr7fsqmpE3ZLehy7pxBS14D</a></td><td>Token deployment and initial distribution</td></tr></tbody></table>

***

### System Wallets

The protocol uses four dedicated wallets for ongoing operations, each with a custom vanity address for easy identification:

<table><thead><tr><th width="100.84375">Wallet</th><th width="466.046875">Address</th><th>Purpose</th></tr></thead><tbody><tr><td><strong>Rewards</strong></td><td><a href="https://solscan.io/account/nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES?cluster=mainnet-beta">nHboSbMF45fUSbqPs6175ysTXj9m6FaFbqryHi7FEES</a></td><td>Collects and distributes holder rewards</td></tr><tr><td><strong>Jackpot</strong></td><td><a href="https://solscan.io/account/RLmJJDUq92SpsbqAXu5HjnMk8qW5KpuNiC6AHxBJACK?cluster=mainnet-beta">RLmJJDUq92SpsbqAXu5HjnMk8qW5KpuNiC6AHxBJACK</a></td><td>Holds funds for lottery draws</td></tr><tr><td><strong>Treasury</strong></td><td><a href="https://solscan.io/account/LKN4hxQh8whrWxC6jG9zHiC3dEP8F8Qus4D9ykkTREA?cluster=mainnet-beta">LKN4hxQh8whrWxC6jG9zHiC3dEP8F8Qus4D9ykkTREA</a></td><td>Project development and operations</td></tr><tr><td><strong>Buyback</strong></td><td><a href="https://solscan.io/account/gBzAZimUfgNm7LdbiWwcg8o41iefYtVexHTiadnBUYB?cluster=mainnet-beta">gBzAZimUfgNm7LdbiWwcg8o41iefYtVexHTiadnBUYB</a></td><td>Executes buybacks and LP injection</td></tr></tbody></table>

***

### Eligibility Requirements

| Feature             | Minimum Holding |
| ------------------- | --------------- |
| Holder Rewards      | 100,000 TRT     |
| Jackpot Eligibility | 100,000 TRT     |

***

### Summary

TRT combines automatic rewards, gamified jackpots, and sustainable tokenomics into a single ecosystem. The 10% tax funds continuous value return to holders while buybacks and burns create long-term deflationary pressure. No staking complexity, no manual claims — just hold and earn.
