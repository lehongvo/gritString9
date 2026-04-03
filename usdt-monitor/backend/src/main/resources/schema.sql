CREATE TABLE IF NOT EXISTS usdt_transactions (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tx_hash         VARCHAR(66)    NOT NULL,
  from_address    VARCHAR(42)    NOT NULL,
  to_address      VARCHAR(42)    NOT NULL,
  value_raw       VARCHAR(78)    NOT NULL,
  value_usdt      DECIMAL(28, 6) NOT NULL,
  block_number    BIGINT         NOT NULL,
  block_timestamp DATETIME       NOT NULL,
  created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tx_hash (tx_hash),
  INDEX idx_block_number (block_number),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sync_state (
  id              INT            PRIMARY KEY DEFAULT 1,
  last_block      BIGINT         NOT NULL DEFAULT 0,
  updated_at      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO sync_state (id, last_block) VALUES (1, 0);
