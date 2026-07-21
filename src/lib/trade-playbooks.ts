/**
 * Trade-specific estimator playbooks.
 *
 * Injected into the proposal-generation prompt so a proposal reads like the
 * real thing for that trade — the right materials, labor phases, units, code
 * considerations, and typical exclusions — instead of a generic estimate.
 */

/** Normalize a free-text trade_type to a known playbook key. */
export function normalizeTradeKey(tradeType?: string | null): string {
  const t = (tradeType || "").toLowerCase();
  if (!t) return "general";
  if (/solar|photovoltaic|\bpv\b/.test(t)) return "solar";
  if (/roof/.test(t)) return "roofing";
  if (/plumb|\bpipe|drain|sewer|water heater/.test(t)) return "plumbing";
  if (/hvac|heat|cool|air.?condition|furnace|\bac\b|mini.?split|duct/.test(t)) return "hvac";
  if (/floor|tile|carpet|hardwood|vinyl|\blvp\b|laminate/.test(t)) return "flooring";
  if (/landscap|lawn|\byard|irrigation|hardscape|paver|garden|sod/.test(t)) return "landscaping";
  if (/electric|wiring|\bpanel|circuit/.test(t)) return "electrical";
  if (/paint|coating/.test(t)) return "painting";
  if (/glaz|glass|window film|curtain wall|storefront|mirror/.test(t)) return "glazing";
  if (/remodel|renovat|kitchen|bath/.test(t)) return "remodeling";
  if (/general|\bgc\b|construction/.test(t)) return "general";
  return "general";
}

const PLAYBOOKS: Record<string, string> = {
  solar:
    "SOLAR PLAYBOOK: Materials — PV panels (by watt/qty), inverter(s) (string or micro), racking/mounting, DC/AC disconnects, wiring/conduit, monitoring, battery/storage if requested, permit & utility interconnection fees. Labor — site/structural assessment, roof attachment, panel + racking install, electrical tie-in & inverter, inspection and PTO coordination. Units — system size in kW/watts (price often per watt). Consider — roof age/condition, orientation & shading, main-panel capacity, net metering, AHJ permitting. Typical exclusions — main panel upgrade, tree removal, roof repairs (unless in scope).",
  roofing:
    "ROOFING PLAYBOOK: Materials — shingles/membrane (per square = 100 sqft), underlayment, ice-and-water shield, drip edge, flashing, ridge vent, fasteners. Labor — tear-off & disposal, deck inspection/repair, underlayment, install, flashing, magnetic-sweep cleanup. Units — squares (100 sqft); add 10% waste. Consider — number of existing layers, pitch, decking condition, ventilation, material + workmanship warranty. Typical exclusions — full deck replacement beyond a set number of sheets, gutter replacement (unless in scope).",
  plumbing:
    "PLUMBING PLAYBOOK: Materials — fixtures (make/model), pipe by linear foot (PEX/copper/PVC), fittings, valves, water heater (tank/tankless + gallons), supply lines, P-traps. Labor — rough-in, fixture set, water-heater install, pressure test, permit/inspection. Units — fixtures, linear feet. Consider — wall/floor access & demo, venting/backflow code, water shutoff, permit. Typical exclusions — concealed pipe defects, wall/floor patching after access (unless in scope).",
  hvac:
    "HVAC PLAYBOOK: Materials — condenser/heat pump (tonnage/SEER), air handler/furnace (BTU/AFUE), ductwork, refrigerant line set, thermostat, disconnect/whip, pad. Labor — remove old equipment, set/mount, duct modifications, refrigerant charge & evacuation, electrical tie-in, startup/commissioning. Units — tons/BTU. Consider — Manual J sizing, duct condition, electrical capacity, refrigerant type (R-410A/R-454B), permit, efficiency rebates. Typical exclusions — full duct replacement, electrical panel upgrade (unless in scope).",
  flooring:
    "FLOORING PLAYBOOK: Materials — flooring by sqft (LVP/tile/hardwood/carpet), underlayment/moisture barrier, transitions, trim/baseboard, adhesive/grout/thinset. Labor — remove existing, subfloor prep/leveling, install, trim, cleanup. Units — sqft; add 10% waste on tile/plank. Consider — subfloor flatness & moisture, room transitions, acclimation time, furniture moving. Typical exclusions — structural subfloor repair, furniture moving (unless in scope).",
  landscaping:
    "LANDSCAPING PLAYBOOK: Materials — plants/trees/shrubs (each), sod/seed (sqft), soil/mulch (cubic yards), pavers/hardscape (sqft), edging, irrigation components, low-voltage lighting. Labor — clearing/grading, planting, hardscape install, irrigation install, mulching, cleanup. Units — sqft, cubic yards, each. Consider — drainage/grading, irrigation zones, plant establishment/warranty, seasonality, HOA/permit. Typical exclusions — ongoing maintenance, large tree removal (unless in scope).",
  electrical:
    "ELECTRICAL PLAYBOOK: Materials — panel/subpanel (amperage), breakers, wire (gauge, linear feet), boxes, devices (receptacles/switches), fixtures, conduit, grounding. Labor — rough-in wiring, device install, panel work, terminations, inspection. Units — circuits, devices, linear feet. Consider — NEC code, load calculation, GFCI/AFCI requirements, existing panel capacity, permit + inspection. Typical exclusions — concealed wiring defects, drywall patching after access (unless in scope).",
  painting:
    "PAINTING PLAYBOOK: Materials — paint (gallons; ~350 sqft/gal/coat), primer, caulk, patching compound, masking/plastic, sundries. Labor — surface prep (scrape/sand/patch), prime, apply coats (state the number), trim/detail, cleanup. Units — sqft of surface; gallons. Consider — number of coats, color changes, interior vs exterior, surface condition, cure time. Typical exclusions — major drywall/carpentry repair, lead abatement (unless in scope).",
  glazing:
    "GLAZING PLAYBOOK: Materials — glass/IGUs (sqft; tempered/laminated/low-E), frames/curtain-wall/storefront systems, film, gaskets/glazing compound, hardware. Labor — field measure, remove existing, frame/system install, glass set, seal, cleanup. Units — sqft, each opening. Consider — safety-glazing code, wind/structural load, egress, energy performance, security-film option. Typical exclusions — structural framing, permit (unless in scope).",
  remodeling:
    "REMODELING PLAYBOOK: Materials — demo disposal, framing, drywall, cabinetry, countertops, fixtures, and finishes per scope. Labor — demo, framing, MEP rough-in (coordinate subs), drywall, finish carpentry, install, punch list. Units — mixed (sqft, linear feet, each). Consider — permit + inspections, trade coordination, allowances for owner-selected finishes, a contingency for unforeseen conditions. Typical exclusions — hidden conditions (mold/rot/code upgrades) beyond allowance, appliances (unless in scope).",
  general:
    "GENERAL CONTRACTING PLAYBOOK: Itemize by phase (demo, materials, labor, subcontractors, finishes). Include permit/inspection where applicable and a contingency line for unforeseen conditions. Units — mixed. Consider — subcontractor coordination, allowances for owner selections, code compliance. Typical exclusions — hidden/unforeseen conditions beyond the stated allowance.",
};

/** Get the estimator playbook text for a given trade. */
export function tradePlaybook(tradeType?: string | null): string {
  return PLAYBOOKS[normalizeTradeKey(tradeType)] || PLAYBOOKS.general;
}

/**
 * Per-trade overhead defaults, as a PERCENT of (materials + labor).
 *
 * A flat 12% is realistic for a small residential repair but far too low for
 * commercial / institutional work, where "non-measured costs" — general
 * conditions, mobilization, supervision, bonds, insurance, and prevailing-wage
 * administration — routinely run 20-30%. The Echols K-8 reroof is the reference
 * point: its real estimate carried $60,010 of non-measured costs on $223,119 of
 * measured scope = 26.9%. At a flat 12% Jobbidder came in ~11% low even with the
 * scope fully priced, so overhead has to be trade-aware to be accurate.
 *
 * Only trades that genuinely carry higher overhead are raised here; every other
 * trade falls back to 12, preserving existing behavior. These are the DEFAULTS a
 * contractor gets before they tune their own pricing_settings.
 */
export const TRADE_OVERHEAD_DEFAULTS: Record<string, number> = {
  roofing: 25, // commercial/institutional roofing: high general conditions, bonds, PW admin
  general: 20, // general contracting: coordination, GCs, contingency
};

/** The default overhead percent for a trade (falls back to 12). */
export function defaultOverheadForTrade(tradeType?: string | null): number {
  return TRADE_OVERHEAD_DEFAULTS[normalizeTradeKey(tradeType)] ?? 12;
}
