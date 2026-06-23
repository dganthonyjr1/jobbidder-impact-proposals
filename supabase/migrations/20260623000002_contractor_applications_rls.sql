-- Enable Row Level Security on contractor_applications table
ALTER TABLE contractor_applications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all contractor applications
CREATE POLICY "Authenticated users can read contractor applications"
  ON contractor_applications
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update contractor applications
CREATE POLICY "Authenticated users can update contractor applications"
  ON contractor_applications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow public (webhook) to insert contractor applications
CREATE POLICY "Public can insert contractor applications"
  ON contractor_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Enable RLS on contractor_survey_responses table
ALTER TABLE contractor_survey_responses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read survey responses
CREATE POLICY "Authenticated users can read survey responses"
  ON contractor_survey_responses
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow public (webhook) to insert survey responses
CREATE POLICY "Public can insert survey responses"
  ON contractor_survey_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated users to update survey responses
CREATE POLICY "Authenticated users can update survey responses"
  ON contractor_survey_responses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
