-- Fix the pricing_settings column default and make overhead trade-aware.
--
-- Two problems with the original default (20260618120000_add_pricing_settings):
--   1. UNITS BUG: it seeded fractions ("overhead": 0.12, "material_markup": 0.35,
--      "profit_margin": 0.20, "tax_rate": 0.07) but the whole app treats these as
--      PERCENTS — computeTotals() divides overhead by 100, DEFAULT_PRICING uses 12/
--      35/20/7, and the Settings UI reads/writes percents. A contractor row created
--      off the raw column default therefore got 0.12% overhead (≈ none). Live rows
--      are fine because the app overwrites them with percents on first save; this
--      just makes the default itself correct.
--   2. FLAT 12% overhead is far too low for commercial/institutional work. The
--      Echols K-8 reroof carried 26.9% "non-measured costs"; at 12% Jobbidder came
--      in ~11% low even with the scope fully priced. Overhead must be trade-aware.
--
-- This only changes the column DEFAULT (used for future inserts that omit
-- pricing_settings). It does NOT modify existing rows and does NOT touch any RLS
-- policy on proposals or estimates.

ALTER TABLE contractors
  ALTER COLUMN pricing_settings SET DEFAULT '{
    "trades": {
      "default": { "labor_rate": 65, "material_markup": 35, "overhead": 12, "profit_margin": 20 },
      "roofing": { "labor_rate": 65, "material_markup": 35, "overhead": 25, "profit_margin": 20 },
      "general": { "labor_rate": 65, "material_markup": 35, "overhead": 20, "profit_margin": 20 }
    },
    "tier_spread": { "good": 0, "better": 18, "best": 38 },
    "tax_rate": 7,
    "currency": "USD",
    "payment_terms": "50% deposit, 50% on completion",
    "warranty_default": "1-year workmanship warranty on all labor"
  }'::jsonb;

COMMENT ON COLUMN contractors.pricing_settings IS
  'Contractor-specific pricing parameters used to drive AI proposal generation. '
  'All rate-like values are PERCENTS (overhead, material_markup, profit_margin, '
  'tax_rate, tier_spread). Overhead is trade-aware: commercial/institutional '
  'trades (roofing, general) default higher than the flat 12% because of general '
  'conditions, bonds, insurance, and prevailing-wage administration.';
