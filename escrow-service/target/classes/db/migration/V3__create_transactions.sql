CREATE TABLE IF NOT EXISTS transactions (
    id                      CHAR(36)       NOT NULL,
    milestone_id            CHAR(36)       NOT NULL,
    provider_transaction_id VARCHAR(100),
    provider_order_id       VARCHAR(100),
    provider_payment_id     VARCHAR(100),
    amount                  DECIMAL(19, 4) NOT NULL,
    currency                VARCHAR(3)     NOT NULL DEFAULT 'INR',
    status                  VARCHAR(20)    NOT NULL DEFAULT 'INITIATED',
    provider                VARCHAR(50)    NOT NULL DEFAULT 'RAZORPAY',
    failure_reason          VARCHAR(500),
    webhook_payload         TEXT,
    idempotency_key         VARCHAR(100)   UNIQUE,
    created_at              DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    completed_at            DATETIME(6),

    CONSTRAINT pk_transactions PRIMARY KEY (id),
    CONSTRAINT fk_transaction_milestone
        FOREIGN KEY (milestone_id) REFERENCES milestones (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_transactions_status CHECK (
        status IN ('INITIATED','PENDING','SUCCESS','FAILED','REFUNDED')
    ),
    CONSTRAINT chk_transactions_amount CHECK (amount >= 0)
);

CREATE INDEX idx_transactions_milestone_id ON transactions (milestone_id);
CREATE INDEX idx_transactions_provider_tx_id ON transactions (provider_transaction_id);
CREATE INDEX idx_transactions_status ON transactions (status);
CREATE INDEX idx_transactions_created_at ON transactions (created_at);
