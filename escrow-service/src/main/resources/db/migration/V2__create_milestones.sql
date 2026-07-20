CREATE TABLE IF NOT EXISTS milestones (
    id               CHAR(36)       NOT NULL,
    contract_id      CHAR(36)       NOT NULL,
    title            VARCHAR(255)   NOT NULL,
    description      TEXT,
    amount           DECIMAL(19, 4) NOT NULL,
    sequence_order   INT            NOT NULL DEFAULT 0,
    status           VARCHAR(30)    NOT NULL DEFAULT 'PENDING',
    due_date         DATE,
    approved_by      CHAR(36),
    approved_at      DATETIME(6),
    released_at      DATETIME(6),
    idempotency_key  VARCHAR(100)   UNIQUE,
    created_at       DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_milestones PRIMARY KEY (id),
    CONSTRAINT fk_milestone_contract
        FOREIGN KEY (contract_id) REFERENCES contracts (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_milestones_status CHECK (
        status IN ('PENDING','IN_PROGRESS','SUBMITTED','APPROVED',
                   'PAYMENT_PROCESSING','RELEASED','FAILED','DISPUTED')
    ),
    CONSTRAINT chk_milestones_amount CHECK (amount >= 0)
);

CREATE INDEX idx_milestones_contract_id ON milestones (contract_id);
CREATE INDEX idx_milestones_status ON milestones (status);
CREATE INDEX idx_milestones_due_date ON milestones (due_date);
