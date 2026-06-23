-- ============================================================================
-- JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
-- Compliance and Performance Tracking System
-- ============================================================================

-- Compliance Audit Trail Table
-- Immutable record of all compliance verification activities
CREATE TABLE IF NOT EXISTS compliance_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractor_applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'document_uploaded',
    'document_verified',
    'compliance_check_passed',
    'compliance_check_failed',
    'expiration_warning',
    'renewal_requested',
    'manual_review_required',
    'compliance_violation',
    'status_changed'
  )),
  document_type TEXT CHECK (document_type IN ('coi', 'license', 'workers_comp', 'surety_bond')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'failed', 'expired', 'renewed')),
  details JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for compliance audit trail
CREATE INDEX IF NOT EXISTS compliance_audit_contractor_idx ON compliance_audit_trail(contractor_id);
CREATE INDEX IF NOT EXISTS compliance_audit_event_type_idx ON compliance_audit_trail(event_type);
CREATE INDEX IF NOT EXISTS compliance_audit_status_idx ON compliance_audit_trail(status);
CREATE INDEX IF NOT EXISTS compliance_audit_created_at_idx ON compliance_audit_trail(created_at);

-- Contractor Performance Events Table
-- Tracks all performance-related events for metrics calculation
CREATE TABLE IF NOT EXISTS contractor_performance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractor_applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'offer_sent',
    'offer_accepted',
    'offer_declined',
    'project_completed',
    'project_failed',
    'project_cancelled',
    'safety_incident',
    'compliance_violation'
  )),
  project_id UUID,
  offer_value DECIMAL(12, 2),
  specialty TEXT,
  state TEXT,
  completion_status TEXT CHECK (completion_status IN ('completed', 'failed', 'cancelled')),
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 100),
  client_satisfaction INTEGER CHECK (client_satisfaction >= 1 AND client_satisfaction <= 5),
  completion_date TIMESTAMPTZ,
  notes TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance events
CREATE INDEX IF NOT EXISTS performance_events_contractor_idx ON contractor_performance_events(contractor_id);
CREATE INDEX IF NOT EXISTS performance_events_event_type_idx ON contractor_performance_events(event_type);
CREATE INDEX IF NOT EXISTS performance_events_project_idx ON contractor_performance_events(project_id);
CREATE INDEX IF NOT EXISTS performance_events_timestamp_idx ON contractor_performance_events(timestamp);

-- Contractor Performance Metrics Table
-- Cached aggregated performance metrics for fast dashboard queries
CREATE TABLE IF NOT EXISTS contractor_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL UNIQUE REFERENCES contractor_applications(id) ON DELETE CASCADE,
  metrics JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance metrics
CREATE INDEX IF NOT EXISTS performance_metrics_contractor_idx ON contractor_performance_metrics(contractor_id);

-- Enable Row Level Security
ALTER TABLE compliance_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_performance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Compliance Audit Trail
CREATE POLICY "Authenticated users can view compliance audit trail"
  ON compliance_audit_trail
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create compliance audit entries"
  ON compliance_audit_trail
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Service role can manage compliance audit trail"
  ON compliance_audit_trail
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for Performance Events
CREATE POLICY "Authenticated users can view performance events"
  ON contractor_performance_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create performance events"
  ON contractor_performance_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can manage performance events"
  ON contractor_performance_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for Performance Metrics
CREATE POLICY "Authenticated users can view performance metrics"
  ON contractor_performance_metrics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage performance metrics"
  ON contractor_performance_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_compliance_audit_trail_updated_at BEFORE UPDATE ON compliance_audit_trail
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_metrics_updated_at BEFORE UPDATE ON contractor_performance_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
