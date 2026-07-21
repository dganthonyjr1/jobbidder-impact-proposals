-- ============================================================================
-- JOBBIDDER.IO — Cost Catalog (unit-cost pricing)
-- ----------------------------------------------------------------------------
-- Grounds proposal pricing in real unit costs instead of LLM-guessed numbers.
-- The AI still identifies scope and quantities; when a line item matches a
-- catalog entry, its price is replaced by the catalog's unit cost (deterministic
-- and defensible). Items with no catalog match keep the AI's estimate, so this
-- is purely additive — behind a flag, an empty catalog changes nothing.
--
-- Rows are either PLATFORM-GLOBAL (contractor_id IS NULL, seeded starter data)
-- or CONTRACTOR-OWNED (their own tuned unit costs, which win over global).
-- Does NOT touch any RLS policy on proposals or estimates.
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_catalog (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = platform-global default catalog; set = this contractor's override
  contractor_id    UUID        REFERENCES contractors(id) ON DELETE CASCADE,
  trade            TEXT        NOT NULL,
  -- stable machine key, e.g. 'tpo_membrane_60mil'
  item_key         TEXT        NOT NULL,
  name             TEXT        NOT NULL,
  unit             TEXT        NOT NULL,                 -- sqft, lin ft, square, each…
  unit_cost        NUMERIC     NOT NULL CHECK (unit_cost >= 0),  -- billed material cost per unit
  retail_unit_cost NUMERIC     CHECK (retail_unit_cost >= 0),    -- optional list price (for savings)
  region           TEXT,                                -- e.g. state code; NULL = national default
  aliases          TEXT[]      NOT NULL DEFAULT '{}',   -- synonyms to match AI line items
  source           TEXT        NOT NULL DEFAULT 'seed', -- seed | contractor | supplier_import
  active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One canonical row per (owner, trade, item, region).
CREATE UNIQUE INDEX IF NOT EXISTS cost_catalog_unique_item
  ON cost_catalog (COALESCE(contractor_id, '00000000-0000-0000-0000-000000000000'::uuid), trade, item_key, COALESCE(region, ''));
CREATE INDEX IF NOT EXISTS cost_catalog_lookup_idx ON cost_catalog (trade, contractor_id) WHERE active;

ALTER TABLE cost_catalog ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read global rows plus their own contractor's rows.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='cost_catalog'
    AND policyname='Read global and own cost catalog'
  ) THEN
    CREATE POLICY "Read global and own cost catalog"
      ON cost_catalog FOR SELECT TO authenticated
      USING (
        contractor_id IS NULL
        OR contractor_id IN (SELECT id FROM contractors WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- A contractor may manage ONLY their own catalog rows (never global rows).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='cost_catalog'
    AND policyname='Manage own cost catalog'
  ) THEN
    CREATE POLICY "Manage own cost catalog"
      ON cost_catalog FOR ALL TO authenticated
      USING (contractor_id IN (SELECT id FROM contractors WHERE user_id = auth.uid()))
      WITH CHECK (contractor_id IN (SELECT id FROM contractors WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Service role (server-side generation) has full access.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='cost_catalog'
    AND policyname='Service role manages cost catalog'
  ) THEN
    CREATE POLICY "Service role manages cost catalog"
      ON cost_catalog FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_cost_catalog_updated_at') THEN
    CREATE TRIGGER update_cost_catalog_updated_at
      BEFORE UPDATE ON cost_catalog
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Starter GLOBAL roofing catalog (national default material unit costs).
-- Realistic commercial-roofing billed material costs; contractors override with
-- their own supplier pricing. unit_cost is the material (sia) cost per unit;
-- labor stays a separate AI line item.
-- ----------------------------------------------------------------------------
INSERT INTO cost_catalog (contractor_id, trade, item_key, name, unit, unit_cost, retail_unit_cost, aliases, source) VALUES
  (NULL, 'roofing', 'tpo_membrane_60mil', 'TPO membrane, 60 mil', 'sqft', 1.30, 1.55, ARRAY['tpo','tpo membrane','thermoplastic','60 mil','60-mil membrane','ultraply'], 'seed'),
  (NULL, 'roofing', 'polyiso_insulation', 'Polyiso roof insulation', 'sqft', 1.55, 1.85, ARRAY['iso','polyiso','insulation','iso 95','tapered insulation','roof insulation'], 'seed'),
  (NULL, 'roofing', 'cover_board_gypsum', 'Gypsum cover board, 1/4"', 'sqft', 0.62, 0.74, ARRAY['cover board','coverboard','densdeck','gypsum board','gypsum cover'], 'seed'),
  (NULL, 'roofing', 'roofing_fasteners_plates', 'Roofing fasteners & plates', 'sqft', 0.20, 0.24, ARRAY['fastener','fasteners','seam plate','insulation plate','barbed plate'], 'seed'),
  (NULL, 'roofing', 'bonding_adhesive', 'TPO bonding adhesive', 'sqft', 0.18, 0.22, ARRAY['bonding adhesive','adhesive','splice wash'], 'seed'),
  (NULL, 'roofing', 'ice_water_shield', 'Ice & water shield', 'sqft', 0.85, 1.02, ARRAY['ice and water','ice & water','water shield','underlayment'], 'seed'),
  (NULL, 'roofing', 'coping_24ga', 'Metal coping, 24 ga', 'lin ft', 14.00, 16.80, ARRAY['coping'], 'seed'),
  (NULL, 'roofing', 'parapet_flashing_24ga', 'Parapet / counter flashing, 24 ga', 'lin ft', 11.00, 13.20, ARRAY['flashing','counterflashing','counter flashing','parapet flashing','parapet'], 'seed'),
  (NULL, 'roofing', 'gutter_24ga_kynar', 'Gutter, 24 ga Kynar', 'lin ft', 12.50, 15.00, ARRAY['gutter','gutters'], 'seed'),
  (NULL, 'roofing', 'downspout_24ga_kynar', 'Downspout, 24 ga Kynar', 'lin ft', 9.00, 10.80, ARRAY['downspout','downspouts','leader','conductor'], 'seed'),
  (NULL, 'roofing', 'drip_edge_metal', 'Metal drip edge, 6"', 'lin ft', 8.50, 10.20, ARRAY['drip edge','drip-edge'], 'seed'),
  (NULL, 'roofing', 'corrugated_metal_canopy', 'Corrugated metal canopy panel, 24 ga SSR', 'sqft', 9.50, 11.40, ARRAY['canopy','corrugated metal','ssr panel','metal roof panel','metal canopy'], 'seed'),
  (NULL, 'roofing', 'tpo_walkway_pad', 'TPO walkway pad', 'each', 45.00, 54.00, ARRAY['walkway','walk pad','walk pads'], 'seed'),
  (NULL, 'roofing', 'roof_drain', 'Roof drain / retrofit drain', 'each', 285.00, 342.00, ARRAY['roof drain','retrofit drain','scupper'], 'seed')
ON CONFLICT DO NOTHING;
