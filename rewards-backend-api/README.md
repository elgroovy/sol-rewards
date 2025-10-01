# Rewards Indexer and Earnings API Plan

## Scope

* Source of truth: only outbound transfers from the FEES wallet (native SOL and SPL tokens).
* Ingestion mode: scheduled polling against Helius RPC.
* History to ingest: ~6 months (initial backfill).
* Database: MySQL.
* Schedule: every 30 minutes, configurable in code.

## Components

### Background Indexer

* Runs on a fixed schedule.
* Fetches new signatures for the FEES wallet since the last cursor.
* Processes outbound transfers (SOL and SPL).
* Writes event rows, updates per-wallet totals, and advances the cursor.
* Initial run processes ~6 months of history until complete.
* Idempotent and reorg-safe by rechecking a small recent window each run.

### Storage

#### `rewards_totals`

* One row per recipient wallet.
* Columns: `wallet`, `sol_total_raw`, `usdc_total_raw`, `last_updated`.
* Primary key: `wallet`.

#### `rewards_token_totals`

* One row per wallet per token mint.
* Columns: `wallet`, `token_mint`, `token_symbol`, `total_raw`, `decimals`, `last_updated`.
* Primary key: `(wallet, token_mint)`.
* Index on `token_mint`.

#### `rewards_events`

* One row per payout to a recipient.
* Columns: `signature`, `slot`, `block_time`, `wallet`, `asset_type`, `token_mint`, `amount_raw`, `decimals`.
* Unique constraint on `(signature, wallet, token_mint)`.
* Indexes on `(wallet, block_time)` and `(token_mint, block_time)`.

#### `indexer_cursor`

* One row for the FEES wallet.
* Columns: `source_wallet`, `last_signature`, `last_slot`, `updated_at`.
* Primary key: `source_wallet`.

### API

* `GET /earnings?address=…`: returns totals for SOL, USDC, and other tokens, plus `lastUpdated`.
* `GET /earnings/history?address=…`: returns paginated events for a wallet (optional).
* `GET /leaderboard?asset=…&range=…`: ranks wallets by totals (optional).

### Scheduling and Configuration

* Default interval: 30 minutes.
* Configurable parameters: index interval, batch sizes, reorg lookback window, backfill start time, maximum tx per run, RPC endpoint.

### Operations

* Monitor: tx fetched per run, events written, run duration, lag from tip, RPC errors, lastUpdated watermark.
* Alerts: if lag exceeds two intervals or runs fail repeatedly.
* Retention: keep `rewards_events` indefinitely to support history and leaderboards.

## Acceptance Criteria

* API reads return from MySQL only, within ~100ms.
* Indexer runs every 30 minutes (configurable) and advances the cursor predictably.
* Backfill completes for the 6-month window.
* Totals equal the sum of events.
* Reprocessing a recent window does not change totals.
