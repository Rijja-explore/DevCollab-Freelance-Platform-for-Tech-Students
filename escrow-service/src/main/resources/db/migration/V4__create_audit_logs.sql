CREATE TABLE IF NOT EXISTS audit_logs (
    id          CHAR(36)    NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   CHAR(36)    NOT NULL,
    action      VARCHAR(50) NOT NULL,
    actor       VARCHAR(100) NOT NULL,
    description TEXT,
    metadata    JSON,
    created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_audit_logs PRIMARY KEY (id)
);

CREATE INDEX idx_audit_entity_type_id ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs (actor);
CREATE INDEX idx_audit_created_at ON audit_logs (created_at);
CREATE INDEX idx_audit_action ON audit_logs (action);

-- Prevent any updates to audit_logs via trigger
CREATE TRIGGER trg_audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Audit logs are immutable. Updates are not permitted.';
