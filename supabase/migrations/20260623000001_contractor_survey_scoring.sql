-- Add NGS survey response fields to contractor_applications table
ALTER TABLE contractor_applications
ADD COLUMN IF NOT EXISTS years_in_operation INTEGER,
ADD COLUMN IF NOT EXISTS commercial_glazing_experience INTEGER,
ADD COLUMN IF NOT EXISTS average_project_size TEXT,
ADD COLUMN IF NOT EXISTS window_film_experience INTEGER,
ADD COLUMN IF NOT EXISTS crew_size INTEGER,
ADD COLUMN IF NOT EXISTS states_licensed TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS osha_record TEXT,
ADD COLUMN IF NOT EXISTS availability TEXT,
ADD COLUMN IF NOT EXISTS surety_bond TEXT,
ADD COLUMN IF NOT EXISTS workers_comp TEXT,
ADD COLUMN IF NOT EXISTS qualification_score INTEGER,
ADD COLUMN IF NOT EXISTS qualification_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS qualification_status TEXT DEFAULT 'PENDING_REVIEW'
  CHECK (qualification_status IN ('APPROVED', 'PENDING_REVIEW', 'REJECTED'));

-- Create a table to track survey completion and scoring history
CREATE TABLE IF NOT EXISTS contractor_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractor_applications(id) ON DELETE CASCADE,
  years_in_operation INTEGER,
  commercial_glazing_experience INTEGER,
  average_project_size TEXT,
  window_film_experience INTEGER,
  crew_size INTEGER,
  states_licensed TEXT[] DEFAULT '{}',
  osha_record TEXT,
  availability TEXT,
  surety_bond TEXT,
  workers_comp TEXT,
  total_score INTEGER,
  percentage DECIMAL(5,2),
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (status IN ('APPROVED', 'PENDING_REVIEW', 'REJECTED')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contractor_survey_responses_contractor_idx
  ON contractor_survey_responses (contractor_id);

CREATE INDEX IF NOT EXISTS contractor_survey_responses_status_idx
  ON contractor_survey_responses (status, created_at);

-- Add indexes for scoring queries
CREATE INDEX IF NOT EXISTS contractor_applications_score_idx
  ON contractor_applications (qualification_score, qualification_status);
