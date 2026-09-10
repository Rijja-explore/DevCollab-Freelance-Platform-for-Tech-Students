-- PostgreSQL Schema for Discovery & Matching Service

-- 1. Auth Users
CREATE TABLE IF NOT EXISTS auth_user (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE
);

-- 3. Projects (Discovery)
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    startup_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    budget NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_startup ON projects(startup_id);

-- 4. Project Skills
CREATE TABLE IF NOT EXISTS project_skills (
    project_id VARCHAR(36) NOT NULL,
    skill VARCHAR(100) NOT NULL,
    PRIMARY KEY (project_id, skill),
    CONSTRAINT fk_project_skills FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_project_skills_skill ON project_skills(skill);

-- 5. Student Profiles
CREATE TABLE IF NOT EXISTS student_profiles (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    headline VARCHAR(255),
    bio TEXT,
    hourly_rate NUMERIC(10, 2) DEFAULT 35.00,
    rating NUMERIC(3, 2) DEFAULT 4.80,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_profiles_user ON student_profiles(user_id);

-- 6. Student Skills
CREATE TABLE IF NOT EXISTS student_skills (
    student_id VARCHAR(36) NOT NULL,
    skill VARCHAR(100) NOT NULL,
    PRIMARY KEY (student_id, skill),
    CONSTRAINT fk_student_skills FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_student_skills_skill ON student_skills(skill);

-- 7. Matches
CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    startup_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    match_score NUMERIC(5, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    matched_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_matches_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_matches_student ON matches(student_id);
CREATE INDEX idx_matches_project ON matches(project_id);

-- Seed Data: Sample Projects
INSERT INTO projects (id, startup_id, title, description, category, budget, currency, status)
VALUES 
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'AI-Powered Resume Analyzer', 'Build a real-time natural language processing tool that screens tech student resumes against job descriptions.', 'AI/ML', 1500.00, 'USD', 'OPEN'),
('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Decentralized Micro-Payment Escrow', 'Create a fast, secure milestone payment tracking system with webhook verification and live dashboards.', 'Fintech', 2400.00, 'USD', 'OPEN'),
('33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Collaborative Code Review Canvas', 'Develop a multi-tenant workspace with real-time Socket.io chat, code snippets, and automated review markers.', 'Web Development', 1800.00, 'USD', 'OPEN'),
('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Cross-Platform React Native Student App', 'Design and implement mobile application for freelance campus tasks with push notifications.', 'Mobile', 2000.00, 'USD', 'OPEN')
ON CONFLICT (id) DO NOTHING;

-- Seed Project Skills
INSERT INTO project_skills (project_id, skill) VALUES
('11111111-1111-1111-1111-111111111111', 'Python'),
('11111111-1111-1111-1111-111111111111', 'FastAPI'),
('11111111-1111-1111-1111-111111111111', 'NLP'),
('22222222-2222-2222-2222-222222222222', 'Java'),
('22222222-2222-2222-2222-222222222222', 'Spring Boot'),
('22222222-2222-2222-2222-222222222222', 'PayPal API'),
('33333333-3333-3333-3333-333333333333', 'React'),
('33333333-3333-3333-3333-333333333333', 'Node.js'),
('33333333-3333-3333-3333-333333333333', 'Socket.io'),
('33333333-3333-3333-3333-333333333333', 'MongoDB'),
('44444444-4444-4444-4444-444444444444', 'React Native'),
('44444444-4444-4444-4444-444444444444', 'TypeScript'),
('44444444-4444-4444-4444-444444444444', 'GraphQL')
ON CONFLICT DO NOTHING;

-- Seed Student Profile
INSERT INTO student_profiles (id, user_id, full_name, headline, bio, hourly_rate, rating)
VALUES 
('99999999-9999-9999-9999-999999999999', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Alex Chen', 'Fullstack & Cloud Engineering Student', 'CS senior with 3 years building microservices, React dashboards, and payment architectures.', 40.00, 4.95)
ON CONFLICT (id) DO NOTHING;

INSERT INTO student_skills (student_id, skill) VALUES
('99999999-9999-9999-9999-999999999999', 'React'),
('99999999-9999-9999-9999-999999999999', 'TypeScript'),
('99999999-9999-9999-9999-999999999999', 'Node.js'),
('99999999-9999-9999-9999-999999999999', 'Java'),
('99999999-9999-9999-9999-999999999999', 'Spring Boot'),
('99999999-9999-9999-9999-999999999999', 'GraphQL')
ON CONFLICT DO NOTHING;
