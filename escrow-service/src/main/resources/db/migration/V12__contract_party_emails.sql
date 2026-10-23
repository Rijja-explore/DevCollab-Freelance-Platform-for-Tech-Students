-- V12: Party email addresses so the reminder scheduler can email startup and student.
-- Populated from the project.matched event, on contract creation and from the JWT of
-- whichever party acts on a milestone.
SET @dbname = DATABASE();

SET @stmt = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'contracts' AND COLUMN_NAME = 'startup_email') > 0,
  'SELECT 1',
  'ALTER TABLE contracts ADD COLUMN startup_email VARCHAR(255) NULL'
));
PREPARE s1 FROM @stmt; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @stmt = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'contracts' AND COLUMN_NAME = 'student_email') > 0,
  'SELECT 1',
  'ALTER TABLE contracts ADD COLUMN student_email VARCHAR(255) NULL'
));
PREPARE s2 FROM @stmt; EXECUTE s2; DEALLOCATE PREPARE s2;
