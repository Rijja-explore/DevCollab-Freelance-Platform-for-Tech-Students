-- V2: Add profile reviews and search indexing support

-- Add review_count column to student_profiles
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;

-- Create reviews table
CREATE TABLE IF NOT EXISTS profile_reviews (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    reviewer_id VARCHAR(36) NOT NULL,
    reviewer_name VARCHAR(255) NOT NULL,
    project_id VARCHAR(36),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_reviews_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profile_reviews_student ON profile_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_profile_reviews_reviewer ON profile_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_reviews_project ON profile_reviews(project_id);

-- Performance indexes for advanced search & filtering
CREATE INDEX IF NOT EXISTS idx_projects_budget ON projects(budget);
CREATE INDEX IF NOT EXISTS idx_student_profiles_rating ON student_profiles(rating);
CREATE INDEX IF NOT EXISTS idx_student_profiles_rate ON student_profiles(hourly_rate);

