import { describe, it, expect, afterEach } from "vitest";
import {
  matchCatalogRow,
  applyCatalogPricing,
  isCostCatalogEnabled,
  type CatalogRow,
} from "@/lib/cost-catalog.server";
import { computeTotals, type MaterialLine } from "@/lib/pricing";

// A small stand-in for the seeded global roofing catalog.
const CATALOG: CatalogRow[] = [
  { id: "tpo", contractor_id: null, trade: "roofing", item_key: "tpo_membrane_60mil", name: "TPO membrane, 60 mil", unit: "sqft", unit_cost: 1.3, retail_unit_cost: 1.55, region: null, aliases: ["tpo", "tpo membrane", "membrane"] },
  { id: "iso", contractor_id: null, trade: "roofing", item_key: "polyiso_insulation", name: "Polyiso roof insulation", unit: "sqft", unit_cost: 1.55, retail_unit_cost: 1.85, region: null, aliases: ["iso", "polyiso", "insulation"] },
  { id: "cb", contractor_id: null, trade: "roofing", item_key: "cover_board_gypsum", name: "Gypsum cover board", unit: "sqft", unit_cost: 0.62, retail_unit_cost: 0.74, region: null, aliases: ["cover board", "densdeck", "gypsum board"] },
  { id: "gut", contractor_id: null, trade: "roofing", item_key: "gutter_24ga_kynar", name: "Gutter, 24 ga Kynar", unit: "lin ft", unit_cost: 12.5, retail_unit_cost: 15, region: null, aliases: ["gutter", "gutters"] },
  { id: "ds", contractor_id: null, trade: "roofing", item_key: "downspout_24ga_kynar", name: "Downspout, 24 ga Kynar", unit: "lin ft", unit_cost: 9, retail_unit_cost: 10.8, region: null, aliases: ["downspout", "downspouts", "leader"] },
  { id: "de", contractor_id: null, trade: "roofing", item_key: "drip_edge_metal", name: "Metal drip edge, 6\"", unit: "lin ft", unit_cost: 8.5, retail_unit_cost: 10.2, region: null, aliases: ["drip edge", "drip-edge"] },
  { id: "can", contractor_id: null, trade: "roofing", item_key: "corrugated_metal_canopy", name: "Corrugated metal canopy panel", unit: "sqft", unit_cost: 9.5, retail_unit_cost: 11.4, region: null, aliases: ["canopy", "corrugated metal", "metal canopy"] },
];

describe("matchCatalogRow", () => {
  it("matches an item to a catalog row by alias", () => {
    expect(matchCatalogRow("New seamless gutters, 24 ga", CATALOG)?.id).toBe("gut");
    expect(matchCatalogRow('6" metal drip edge at eaves', CATALOG)?.id).toBe("de");
    expect(matchCatalogRow("Corrugated Metal Roof Canopy — SSR panels", CATALOG)?.id).toBe("can");
  });

  it("returns null when nothing matches", () => {
    expect(matchCatalogRow("Skylight curb adapter", CATALOG)).toBeNull();
  });

  it("prefers a contractor-owned row over a global one", () => {
    const own: CatalogRow = { ...CATALOG[3], id: "gut-own", contractor_id: "c1", unit_cost: 18 };
    const best = matchCatalogRow("gutters", [...CATALOG, own]);
    expect(best?.id).toBe("gut-own");
    expect(best?.unit_cost).toBe(18);
  });

  it("respects region: a region-specific row only applies to its region", () => {
    const ga: CatalogRow = { ...CATALOG[3], id: "gut-ga", region: "GA", unit_cost: 13.75 };
    const rows = [...CATALOG, ga];
    // In GA, the GA row wins.
    expect(matchCatalogRow("gutters", rows, { region: "GA" })?.id).toBe("gut-ga");
    // In TX, the GA row is skipped and the national default is used.
    expect(matchCatalogRow("gutters", rows, { region: "TX" })?.id).toBe("gut");
  });
});

describe("applyCatalogPricing", () => {
  const aiMaterials: MaterialLine[] = [
    { item: "TPO membrane 60 mil", qty: 30000, unit: "sqft", sia_price: 99, retail_price: 120 }, // junk AI price
    { item: "Polyiso insulation", qty: 30000, unit: "sqft", sia_price: 99, retail_price: 120 },
    { item: "Gypsum cover board", qty: 30000, unit: "sqft", sia_price: 99, retail_price: 120 },
    { item: "Gutters, 24 ga Kynar", qty: 600, unit: "lin ft", sia_price: 99, retail_price: 120 },
    { item: "Downspouts", qty: 400, unit: "lin ft", sia_price: 99, retail_price: 120 },
    { item: '6" drip edge', qty: 519, unit: "lin ft", sia_price: 99, retail_price: 120 },
    { item: "Corrugated metal canopy", qty: 1200, unit: "sqft", sia_price: 99, retail_price: 120 },
    { item: "Pipe boot flashing (misc)", qty: 12, unit: "each", sia_price: 45, retail_price: 60 }, // no catalog match
  ];

  it("overrides matched prices with catalog unit costs and leaves misses alone", () => {
    const { materials, coverage } = applyCatalogPricing(aiMaterials, CATALOG);
    const byItem = Object.fromEntries(materials.map((m) => [m.item, m]));
    expect(byItem["Gutters, 24 ga Kynar"].sia_price).toBe(12.5);
    expect(byItem["Gutters, 24 ga Kynar"].catalog_id).toBe("gut");
    expect(byItem['6" drip edge'].sia_price).toBe(8.5);
    // Unmatched item keeps its AI price and gets no catalog_id.
    expect(byItem["Pipe boot flashing (misc)"].sia_price).toBe(45);
    expect(byItem["Pipe boot flashing (misc)"].catalog_id).toBeUndefined();

    expect(coverage.total).toBe(8);
    expect(coverage.matched).toBe(7);
    expect(coverage.ratio).toBeCloseTo(7 / 8, 5);
  });

  it("is deterministic: the AI's guessed price cannot change a cataloged total", () => {
    const priced = applyCatalogPricing(aiMaterials, CATALOG).materials;
    // Same inputs but wildly different AI prices → identical cataloged prices.
    const tampered = aiMaterials.map((m) => ({ ...m, sia_price: m.sia_price! * 7.3 }));
    const priced2 = applyCatalogPricing(tampered, CATALOG).materials;

    const siaOf = (arr: MaterialLine[], item: string) => arr.find((m) => m.item === item)!.sia_price;
    for (const item of ["TPO membrane 60 mil", "Gutters, 24 ga Kynar", '6" drip edge', "Corrugated metal canopy"]) {
      expect(siaOf(priced, item)).toBe(siaOf(priced2, item));
    }

    // The cataloged material subtotal is a fixed, hand-verifiable number.
    const materialsSia = computeTotals(priced, [], "better", 0.07, 25).materialsSia;
    // 30000*1.30 + 30000*1.55 + 30000*0.62 + 600*12.5 + 400*9 + 519*8.5 + 1200*9.5
    //  = 39000 + 46500 + 18600 + 7500 + 3600 + 4411.5 + 11400 = 131011.5  (+ misc 12*45=540)
    expect(materialsSia).toBeCloseTo(131011.5 + 540, 2);
  });

  it("with an empty catalog it is a pure no-op (never regresses today's pipeline)", () => {
    const { materials, coverage } = applyCatalogPricing(aiMaterials, []);
    expect(materials).toEqual(aiMaterials);
    expect(coverage.matched).toBe(0);
    expect(coverage.ratio).toBe(0);
  });
});

describe("isCostCatalogEnabled", () => {
  afterEach(() => {
    delete process.env.COST_CATALOG_ENABLED;
  });

  it("is off by default", () => {
    expect(isCostCatalogEnabled(null)).toBe(false);
    expect(isCostCatalogEnabled({ pricing_settings: {} })).toBe(false);
  });

  it("turns on via the global env flag", () => {
    process.env.COST_CATALOG_ENABLED = "true";
    expect(isCostCatalogEnabled(null)).toBe(true);
  });

  it("turns on per-contractor via pricing_settings.use_cost_catalog", () => {
    expect(isCostCatalogEnabled({ pricing_settings: { use_cost_catalog: true } })).toBe(true);
  });
});
