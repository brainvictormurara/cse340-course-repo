-- ========================================
-- Reset Database Tables
-- ========================================

DROP TABLE IF EXISTS project_category;
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS project;
DROP TABLE IF EXISTS organization;


-- ========================================
-- Organization Table
-- ========================================

CREATE TABLE organization (
    organization_id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    contact_email VARCHAR(255) UNIQUE NOT NULL,
    logo_filename VARCHAR(255) NOT NULL
);


-- ========================================
-- Insert Organizations
-- ========================================

INSERT INTO organization (
    name,
    description,
    contact_email,
    logo_filename
)
VALUES
(
    'BrightFuture Builders',
    'A nonprofit focused on improving community infrastructure through sustainable construction projects.',
    'info@brightfuturebuilders.org',
    'brightfuture-logo.png'
),
(
    'GreenHarvest Growers',
    'An urban farming collective promoting food sustainability and education in local neighborhoods.',
    'contact@greenharvest.org',
    'greenharvest-logo.png'
),
(
    'UnityServe Volunteers',
    'A volunteer coordination group supporting local charities and service initiatives.',
    'hello@unityserve.org',
    'unityserve-logo.png'
);


-- ========================================
-- Project Table
-- ========================================

CREATE TABLE project (
    project_id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    date DATE NOT NULL,

    CONSTRAINT fk_project_organization
        FOREIGN KEY (organization_id)
        REFERENCES organization (organization_id)
        ON DELETE CASCADE
);


-- ========================================
-- Insert 15 Service Projects
-- ========================================

INSERT INTO project (
    organization_id,
    title,
    description,
    location,
    date
)
SELECT
    organization.organization_id,
    project_data.title,
    project_data.description,
    project_data.location,
    project_data.project_date
FROM (
    VALUES
    (
        'BrightFuture Builders',
        'Community Centre Renovation',
        'Renovate a community centre to provide a safe space for local activities.',
        'Marondera Community Centre',
        DATE '2026-09-16'
    ),
    (
        'BrightFuture Builders',
        'Playground Construction',
        'Build a safe and accessible playground for children in the community.',
        'Marondera Community Centre',
        DATE '2026-09-17'
    ),
    (
        'BrightFuture Builders',
        'Home Repair Assistance',
        'Repair damaged homes for elderly and vulnerable community members.',
        'Marondera Community Centre',
        DATE '2026-09-18'
    ),
    (
        'BrightFuture Builders',
        'School Classroom Improvement',
        'Improve classrooms by repairing walls, floors, windows, and furniture.',
        'Marondera Community Centre',
        DATE '2026-09-19'
    ),
    (
        'BrightFuture Builders',
        'Public Park Restoration',
        'Restore damaged park structures and improve public recreation areas.',
        'Marondera Community Centre',
        DATE '2026-09-20'
    ),
    (
        'GreenHarvest Growers',
        'Community Garden',
        'Establish a community garden that provides fresh vegetables to local families.',
        'Marondera Urban Farm',
        DATE '2026-09-21'
    ),
    (
        'GreenHarvest Growers',
        'Urban Farming Workshop',
        'Teach residents practical skills for growing food in small urban spaces.',
        'Marondera Urban Farm',
        DATE '2026-09-22'
    ),
    (
        'GreenHarvest Growers',
        'School Nutrition Garden',
        'Create a vegetable garden that supports nutrition education at a local school.',
        'Marondera Urban Farm',
        DATE '2026-09-23'
    ),
    (
        'GreenHarvest Growers',
        'Composting Programme',
        'Train households to turn organic waste into compost for food gardens.',
        'Marondera Urban Farm',
        DATE '2026-09-24'
    ),
    (
        'GreenHarvest Growers',
        'Seedling Distribution',
        'Produce and distribute vegetable seedlings to families starting home gardens.',
        'Marondera Urban Farm',
        DATE '2026-09-25'
    ),
    (
        'UnityServe Volunteers',
        'Community Food Drive',
        'Collect and distribute food supplies to families experiencing food insecurity.',
        'Marondera Civic Centre',
        DATE '2026-09-26'
    ),
    (
        'UnityServe Volunteers',
        'Student Tutoring Programme',
        'Provide volunteer tutoring to students who need additional academic support.',
        'Marondera Civic Centre',
        DATE '2026-09-27'
    ),
    (
        'UnityServe Volunteers',
        'Elderly Support Visits',
        'Organize volunteers to visit and assist elderly residents in the community.',
        'Marondera Civic Centre',
        DATE '2026-09-28'
    ),
    (
        'UnityServe Volunteers',
        'Clothing Donation Campaign',
        'Collect and distribute clothing to vulnerable children and adults.',
        'Marondera Civic Centre',
        DATE '2026-09-29'
    ),
    (
        'UnityServe Volunteers',
        'Community Health Awareness',
        'Support local health-awareness events through volunteer coordination.',
        'Marondera Civic Centre',
        DATE '2026-09-30'
    )
) AS project_data (
    organization_name,
    title,
    description,
    location,
    project_date
)
JOIN organization
    ON organization.name = project_data.organization_name;


-- ========================================
-- Category Table
-- ========================================

CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);


-- ========================================
-- Insert Categories
-- ========================================

INSERT INTO category (name)
VALUES
    ('Community Support'),
    ('Construction'),
    ('Education'),
    ('Environment'),
    ('Food Security');


-- ========================================
-- Project-Category Junction Table
-- ========================================

CREATE TABLE project_category (
    project_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,

    PRIMARY KEY (project_id, category_id),

    CONSTRAINT fk_project_category_project
        FOREIGN KEY (project_id)
        REFERENCES project (project_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_project_category_category
        FOREIGN KEY (category_id)
        REFERENCES category (category_id)
        ON DELETE CASCADE
);


-- ========================================
-- Connect Projects to Categories
-- ========================================

INSERT INTO project_category (
    project_id,
    category_id
)
SELECT
    project.project_id,
    category.category_id
FROM (
    VALUES
        ('Community Centre Renovation', 'Construction'),
        ('Playground Construction', 'Construction'),
        ('Home Repair Assistance', 'Construction'),
        ('School Classroom Improvement', 'Education'),
        ('Public Park Restoration', 'Environment'),
        ('Community Garden', 'Food Security'),
        ('Urban Farming Workshop', 'Education'),
        ('School Nutrition Garden', 'Food Security'),
        ('Composting Programme', 'Environment'),
        ('Seedling Distribution', 'Food Security'),
        ('Community Food Drive', 'Food Security'),
        ('Student Tutoring Programme', 'Education'),
        ('Elderly Support Visits', 'Community Support'),
        ('Clothing Donation Campaign', 'Community Support'),
        ('Community Health Awareness', 'Community Support')
) AS assignment_data (
    project_title,
    category_name
)
JOIN project
    ON project.title = assignment_data.project_title
JOIN category
    ON category.name = assignment_data.category_name;


-- ========================================
-- Verification Queries
-- ========================================

SELECT
    project.project_id,
    project.date,
    project.title,
    project.location,
    organization.name AS organization_name
FROM project
JOIN organization
    ON project.organization_id = organization.organization_id
ORDER BY project.date, project.title;

SELECT
    project.title AS project_title,
    category.name AS category_name
FROM project_category
JOIN project
    ON project_category.project_id = project.project_id
JOIN category
    ON project_category.category_id = category.category_id
ORDER BY project.title, category.name;