-- Add pricing_settings JSONB column to contractors table
-- This allows each contractor to define their own cost parameters
-- which are injected into the Claude AI prompt for accurate proposal pricing.

ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS pricing_settings JSONB DEFAULT '{
    "trades": {
      "default": {
        "labor_rate": 65,
        "material_markup": 0.35,
        "overhead": 0.12,
        "profit_margin": 0.20
      }
    },
    "tier_spread": {
      "good": 0,
      "better": 0.18,
      "best": 0.38
    },
    "tax_rate": 0.07,
    "currency": "USD",
    "payment_terms": "50% deposit, 50% on completion",
    "warranty_default": "1-year workmanship warranty on all labor"
  }'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN contractors.pricing_settings IS
  'Contractor-specific pricing parameters used to drive AI proposal generation. '
  'Includes per-trade labor rates, material markup, overhead, profit margin, '
  'tier spreads (Good/Better/Best), tax rate, and payment terms.';
