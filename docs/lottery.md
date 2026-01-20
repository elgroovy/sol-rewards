# Lottery

<figure><img src=".gitbook/assets/jackpot_char.png" alt="" width="375"><figcaption></figcaption></figure>

## How the Jackpot Winner Selection Works

Here's a simple explanation of how winners are chosen:

### Who Can Win?

First, the system checks who's eligible. To qualify, you need to hold a minimum amount of tokens in your wallet.

### The Drawing Process

**Step 1: Sort holders into two groups**

* **Old holders** — people who already held tokens before the current draw
* **New holders** — people who just recently started holding tokens

**Step 2: Pick candidates from each group**

* The system randomly selects one person from the old holders
* The system randomly selects one person from the new holders

**Step 3: Final coin flip**

* If both an old holder and a new holder were found, the system does a 50/50 coin flip to decide which one actually wins
* Only ONE person wins the jackpot

### The Randomness

The winner selection uses cryptographic randomness (the same type of secure randomness used in encryption), making it impossible to predict or manipulate who gets selected.

### The Prize Split Setup

The jackpot fund is pre-divided into portions for old holders versus new holders — but since only one winner is chosen via the coin flip, the winning person gets their group's entire share.

***

**In short:** Everyone eligible gets thrown into a hat (sorted by new vs. old holder), one name is drawn from each hat, then a coin flip decides the final winner.

<figure><img src=".gitbook/assets/jackbot_transparent.png" alt="" width="375"><figcaption></figcaption></figure>
