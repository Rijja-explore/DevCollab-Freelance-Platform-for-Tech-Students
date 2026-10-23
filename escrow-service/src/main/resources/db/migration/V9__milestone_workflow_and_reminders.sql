-- V9: Milestone-based release workflow extensions and payment reminder scheduler

-- 1. Add workflow tracking columns to milestones
ALTER TABLE milestones ADD COLUMN deliverable_url VARCHAR(500) NULL;
ALTER TABLE milestones ADD COLUMN submission_notes TEXT NULL;
ALTER TABLE milestones ADD COLUMN review_feedback TEXT NULL;
ALTER TABLE milestones ADD COLUMN revision_count INT NOT NULL DEFAULT 0;
ALTER TABLE milestones ADD COLUMN started_at DATETIME(6) NULL;
ALTER TABLE milestones ADD COLUMN submitted_at DATETIME(6) NULL;
ALTER TABLE milestones ADD COLUMN dispute_reason TEXT NULL;
ALTER TABLE milestones ADD COLUMN disputed_at DATETIME(6) NULL;
ALTER TABLE milestones ADD COLUMN dispute_resolved_at DATETIME(6) NULL;
ALTER TABLE milestones ADD COLUMN dispute_resolution VARCHAR(50) NULL;

-- 2. Create payment reminders table
CREATE TABLE IF NOT EXISTS payment_reminders (
    id CHAR(36) NOT NULL,
    milestone_id CHAR(36) NULL,
    contract_id CHAR(36) NULL,
    recipient_id CHAR(36) NULL,
    recipient_email VARCHAR(255) NULL,
    reminder_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SENT',
    sent_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_payment_reminders PRIMARY KEY (id),
    CONSTRAINT fk_reminder_milestone FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
    CONSTRAINT fk_reminder_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
);

CREATE INDEX idx_payment_reminders_milestone ON payment_reminders(milestone_id);
CREATE INDEX idx_payment_reminders_contract ON payment_reminders(contract_id);
CREATE INDEX idx_payment_reminders_type ON payment_reminders(reminder_type);
CREATE INDEX idx_payment_reminders_sent_at ON payment_reminders(sent_at);

