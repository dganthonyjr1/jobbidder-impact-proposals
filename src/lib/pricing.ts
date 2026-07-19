export const STATE_LIST = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

/** Max length for the job description / spec field on proposal intake. A single
 * real CSI MasterFormat spec section runs 35-50k+ characters raw (confirmed against
 * an actual architect's roofing section) — this is a paste-fallback ceiling, not a
 * real limit. The actual fix for full spec packages is PDF upload + extraction (P2),
 * not a bigger number here. Never silently truncate. */
export const JOB_DESCRIPTION_MAX_LENGTH = 50000;

export const TIER_MULTIPLIERS: Record<string, number> = {
  good: 0.85,
  better: 1.0,
  best: 1.2,
};

export const TIER_LABELS: Record<string, { name: string; tagline: string }> = {
  good: { name: "Good", tagline: "Essential quality, smart savings" },
  better: { name: "Better", tagline: "Recommended — best value" },
  best: { name: "Best", tagline: "Premium materials & finishes" },
};

export type MaterialLine = {
  item: string;
  description?: string;
  qty: number;
  unit: string;
  sia_price: number | null;
  retail_price: number;
  catalog_id?: string;
};

export type LaborLine = {
  task: string;
  description?: string;
  hours: number;
  rate: number;
};

export function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

export function computeTotals(materials: MaterialLine[], labor: LaborLine[], tier: string, taxRate = 0.07, overheadPercentage = 0) {
  const mult = TIER_MULTIPLIERS[tier] ?? 1;
  const materialsRetail = materials.reduce((s, m) => s + (m.retail_price || 0) * m.qty, 0) * mult;
  const materialsSia = materials.reduce((s, m) => s + ((m.sia_price ?? m.retail_price) || 0) * m.qty, 0) * mult;
  const laborTotal = labor.reduce((s, l) => s + l.hours * l.rate, 0) * mult;
  const savings = materialsRetail - materialsSia;
  const subtotal = materialsSia + laborTotal;
  const tax = materialsSia * taxRate;
  const overheadAmount = (materialsSia + laborTotal) * (overheadPercentage || 0) / 100;
  const grandTotal = subtotal + tax + overheadAmount;
  return { materialsRetail, materialsSia, laborTotal, savings, subtotal, tax, overheadAmount, grandTotal };
}

export function generateProposalNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SIA-${y}${m}${day}-${rand}`;
}

export const RESTRICTED_SPC_STATES = ["MN","WI","MI","ND","SD","IL","IA","MO","NE","KS"];