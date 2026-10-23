-- V10: Milestone-based release workflow extensions and payment reminder scheduler

SET @dbname = DATABASE();
SET @tablename = 'milestones';

-- 1. deliverable_url
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'deliverable_url') > 0,
  'SELECT 1',
  'ALTER TABLE milestones ADD COLUMN deliverable_url VARCHAR(500) NULL'
));
PREPARE stmt1 FROM @preparedStatement;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- 2. submission_notes
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'submission_notes') > 0,
  'SELECT 1',
  'ALTER TABLE milestones ADD COLUMN submission_notes TEXT NULL'
));
PREPARE stmt2 FROM @preparedStatement;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3. review_feedback
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'review_feedback') > 0,
  'SELECT 1',
  'ALTER TABLE milestones ADD COLUMN review_feedback TEXT NULL'
));
PREPARE stmt3 FROM @preparedStatement;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- 4. revision_count
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'revision_count') > 0,
  'SELECT 1',
  'ALTER TABLE milestones ADD COLUMN revision_count INT NOT NULL DEFAULT 0'
));
PREPARE stmt4 FROM @preparedStatement;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

-- 5. started_at
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'started_at') > 0,
  'SELECT 1',
  'ALTER TABLE milestones ADD COLUMN started_at DATETIME(6) NULL'
));
PREPARE stmt5 FROM @preparedStatement;
EXECUTE stmt5;
DEALLOCATE PREPARE stmt5;

-- 6. submitted_at
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'submitted_at') > 0,
  'SELECT 1',
  'ALTER TABLE milestones ADD COLUMN submitted_at DATETIME(6) NULL'
));
PREPARE stmt6 FROM @preparedStatement;
EXECUTE stmt6;
DEALLOCATE PREPARE stmt6;

-- 7. dispute_reason
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'dispute_reason') > 0,
  'SELECT 1',
  'ALTER TABLE milestones ADD COLUMN dispute_reason TEXT NULL'
));
PREPARE stmt7 FROM @preparedStatement;
EXECUTE stmt7;
DEALLOCATE PREPARE stmt7;

-- 8. disputed_at
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'disputed_at') > 0,
  'SELECT 1',
  'ALTER TABLE milestones ADD COLUMN disputed_at DATETIME(6) NULL'
));
PREPARE stmt8 FROM @preparedStatement;
EXECUTE stmt8;
DEALLOCATE PREPARE stmt8;

-- 9. dispute_resolved_at
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'dispute_resolved_at') > 0,
  'SELECT 1',
  'ALTER TABLE milestones ADD COLUMN dispute_resolved_at DATETIME(6) NULL'
));
PREPARE stmt9 FROM @preparedStatement;
EXECUTE stmt9;
DEALLOCATE PREPARE stmt9;

-- 10. dispute_resolution
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'dispute_resolution') > 0,
  'SELECT 1',
  'ALTER TABLE milestones ADD COLUMN dispute_resolution VARCHAR(50) NULL'
));
PREPARE stmt10 FROM @preparedStatement;
EXECUTE stmt10;
DEALLOCATE PREPARE stmt10;

-- 11. Create payment_reminders table if not exists
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
    CONSTRAINT fk_reminder_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
    INDEX idx_payment_reminders_milestone (milestone_id),
    INDEX idx_payment_reminders_contract (contract_id),
    INDEX idx_payment_reminders_type (reminder_type),
    INDEX idx_payment_reminders_sent_at (sent_at)
);
