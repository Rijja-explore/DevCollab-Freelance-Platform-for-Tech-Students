CREATE TABLE IF NOT EXISTS contracts (
    id           CHAR(36)       NOT NULL,
    project_id   CHAR(36)       NOT NULL,
    startup_id   CHAR(36)       NOT NULL,
    student_id   CHAR(36)       NOT NULL,
    title        VARCHAR(255)   NOT NULL,
    description  TEXT,
    total_amount DECIMAL(19, 4) NOT NULL,
    status       VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    currency     VARCHAR(3)     NOT NULL DEFAULT 'INR',
    terms        TEXT,
    created_at   DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at   DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_contracts PRIMARY KEY (id),
    CONSTRAINT chk_contracts_status CHECK (status IN ('PENDING','ACTIVE','COMPLETED','DISPUTED','CANCELLED')),
    CONSTRAINT chk_contracts_total_amount CHECK (total_amount >= 0)
);

CREATE INDEX idx_contracts_project_id ON contracts (project_id);
CREATE INDEX idx_contracts_startup_id ON contracts (startup_id);
CREATE INDEX idx_contracts_student_id ON contracts (student_id);
CREATE INDEX idx_contracts_status ON contracts (status);
CREATE INDEX idx_contracts_created_at ON contracts (created_at);
