CREATE TABLE organization (
    organization_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    logo_filename VARCHAR(255) NOT NULL
);

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
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    CONSTRAINT fk_project_organization
        FOREIGN KEY (organization_id)
        REFERENCES organization (organization_id)
);
-- ========================================
-- Insert Sample Projects
-- ========================================

INSERT INTO project (organization_id, name, description)
VALUES
(
    (SELECT organization_id FROM organization
     WHERE name = 'BrightFuture Builders'),
    'Community Centre Renovation',
    'Renovate a community centre to provide a safe space for local activities.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'BrightFuture Builders'),
    'Playground Construction',
    'Build a safe and accessible playground for children in the community.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'BrightFuture Builders'),
    'Home Repair Assistance',
    'Repair damaged homes for elderly and vulnerable community members.'
),
(
       (SELECT organization_id FROM organization
     WHERE name = 'BrightFuture Builders'),
    'School Classroom Improvement',
    'Improve classrooms by repairing walls, floors, windows, and furniture.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'BrightFuture Builders'),
    'Public Park Restoration',
    'Restore damaged park structures and improve public recreation areas.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'GreenHarvest Growers'),
    'Community Garden',
    'Establish a community garden that provides fresh vegetables to local families.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'GreenHarvest Growers'),
    'Urban Farming Workshop',
    'Teach residents practical skills for growing food in small urban spaces.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'GreenHarvest Growers'),
    'School Nutrition Garden',
    'Create a vegetable garden that supports nutrition education at a local school.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'GreenHarvest Growers'),
    'Composting Programme',
    'Train households to turn organic waste into compost for food gardens.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'GreenHarvest Growers'),
    'Seedling Distribution',
    'Produce and distribute vegetable seedlings to families starting home gardens.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'UnityServe Volunteers'),
    'Community Food Drive',
    'Collect and distribute food supplies to families experiencing food insecurity.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'UnityServe Volunteers'),
    'Student Tutoring Programme',
    'Provide volunteer tutoring to students who need additional academic support.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'UnityServe Volunteers'),
    'Elderly Support Visits',
    'Organize volunteers to visit and assist elderly residents in the community.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'UnityServe Volunteers'),
    'Clothing Donation Campaign',
    'Collect and distribute clothing to vulnerable children and adults.'
),
(
    (SELECT organization_id FROM organization
     WHERE name = 'UnityServe Volunteers'),
    'Community Health Awareness',
    'Support local health-awareness events through volunteer coordination.'
);

-- ========================================
-- Category Table
-- ========================================

CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

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