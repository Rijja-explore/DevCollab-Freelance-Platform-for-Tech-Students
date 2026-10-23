-- V11: Re-apply the V9 widening of milestones.approved_by.
-- Some databases have V9 recorded as successful in flyway_schema_history while the
-- column is still CHAR(36), which makes Hibernate schema validation fail on startup.
-- MODIFY is idempotent, so this is safe on databases where V9 did take effect.
ALTER TABLE milestones MODIFY approved_by VARCHAR(100) NULL;
