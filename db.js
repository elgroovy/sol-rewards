
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "admin",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "solrewards",
  waitForConnections: true,
  connectionLimit: 10,
  supportBigNumbers: true,
  dateStrings: true,
});

function query(sql, params) {
  return pool.execute(sql, params);
}

function getConnection() {
  return pool.getConnection();
}

module.exports = { pool, query, getConnection };

/*
CREATE DATABASE IF NOT EXISTS solrewards CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE solrewards;

-- Reward eligibility for holders
CREATE TABLE eligible_holders (
    wallet_address VARCHAR(255) UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rewards totals (SOL + USDC) in RAW units
CREATE TABLE IF NOT EXISTS rewards_totals (
  wallet           VARCHAR(64) NOT NULL,
  sol_total_raw    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  usdc_total_raw   BIGINT UNSIGNED NOT NULL DEFAULT 0,
  last_updated     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (wallet)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Totals for any other SPL token (row-per-token)
CREATE TABLE IF NOT EXISTS rewards_token_totals (
  wallet         VARCHAR(64) NOT NULL,
  token_mint     VARCHAR(64) NOT NULL,
  token_symbol   VARCHAR(32) NULL,
  total_raw      BIGINT UNSIGNED NOT NULL DEFAULT 0,  -- raw token units
  decimals       TINYINT UNSIGNED NOT NULL,           -- token mint decimals
  last_updated   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (wallet, token_mint),
  KEY idx_token (token_mint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Append-only payout events (store RAW + decimals)
CREATE TABLE IF NOT EXISTS rewards_events (
  signature    VARCHAR(128) NOT NULL,
  slot         BIGINT NOT NULL,
  block_time   TIMESTAMP NOT NULL,
  wallet       VARCHAR(64) NOT NULL,
  asset_type   ENUM('SOL','SPL') NOT NULL,
  token_mint   VARCHAR(64) NOT NULL,
  amount_raw   BIGINT UNSIGNED NOT NULL,
  decimals     TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (signature, wallet, token_mint),
  KEY idx_wallet_time (wallet, block_time),
  KEY idx_token_time (token_mint, block_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexer cursor (watermark)
CREATE TABLE IF NOT EXISTS indexer_cursor (
  source_wallet   VARCHAR(64) NOT NULL,
  last_signature  VARCHAR(128) NULL,
  last_slot       BIGINT NULL,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (source_wallet)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/
