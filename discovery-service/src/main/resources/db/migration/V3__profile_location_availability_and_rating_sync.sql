-- V3: Location / availability search filters and review-driven ratings

ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS availability VARCHAR(30) DEFAULT 'AVAILABLE';
UPDATE student_profiles SET availability = 'AVAILABLE' WHERE availability IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_profiles_location ON student_profiles (LOWER(location));
CREATE INDEX IF NOT EXISTS idx_student_profiles_availability ON student_profiles (availability);

-- Keep only the newest review per (student, reviewer, project) before adding the unique index below
DELETE FROM profile_reviews pr
USING profile_reviews newer
WHERE pr.student_id = newer.student_id
  AND pr.reviewer_id = newer.reviewer_id
  AND COALESCE(pr.project_id, '') = COALESCE(newer.project_id, '')
  AND (pr.created_at, pr.id) < (newer.created_at, newer.id);

-- Ratings are an aggregate of profile_reviews. Earlier code seeded a hard-coded 4.8/4.9
-- on every new profile; recompute from the real reviews (0 when a profile has none).
ALTER TABLE student_profiles ALTER COLUMN rating SET DEFAULT 0;
UPDATE student_profiles sp
SET rating       = COALESCE(r.avg_rating, 0),
    review_count = COALESCE(r.cnt, 0)
FROM student_profiles base
LEFT JOIN (
    SELECT student_id, ROUND(AVG(rating)::numeric, 2) AS avg_rating, COUNT(*) AS cnt
    FROM profile_reviews
    GROUP BY student_id
) r ON r.student_id = base.id
WHERE sp.id = base.id;

-- One review per reviewer per student per project (NULL project = general review)
CREATE UNIQUE INDEX IF NOT EXISTS uq_profile_reviews_reviewer_project
    ON profile_reviews (student_id, reviewer_id, COALESCE(project_id, ''));
