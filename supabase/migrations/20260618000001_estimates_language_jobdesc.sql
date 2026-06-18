-- Add language and job_description columns to estimates table
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS job_description text;
