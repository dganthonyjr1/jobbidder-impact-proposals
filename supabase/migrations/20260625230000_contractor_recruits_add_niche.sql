-- Add service_niche column to contractor_recruits to track which NGS service
-- category a recruited contractor is being invited for.
ALTER TABLE contractor_recruits
  ADD COLUMN IF NOT EXISTS service_niche TEXT;

CREATE INDEX IF NOT EXISTS contractor_recruits_niche_idx ON contractor_recruits(service_niche);

COMMENT ON COLUMN contractor_recruits.service_niche IS
  'NGS service niche slug, e.g. window-film-installation, building-perimeter-hardening, energy-modeling';
