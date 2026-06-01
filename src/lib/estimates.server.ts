import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type EstimateAIShape = {
  scope_summary: string;
  material_low: number;
  material_high: number;
  labor_low: number;
  labor_high: number;
  total_low: number;
  total_high: number;
  timeline_text: string;
};

export async function callClaudeForEstimate(opts: {
  apiKey: string;
  contractor: { business_name: string; trade_type: string | null };
  job: {
    client_name: string;
    job_address: string | null;
    job_state: string | null;
    trade_type: string | null;
    job_description: string;
  };
  language?: string;
}): Promise<EstimateAIShape> {
  const langName = languageName(opts.language);
  const system = `You are a senior estimator for ${opts.contractor.business_name} (${opts.contractor.trade_type || opts.job.trade_type || "general contracting"}). Produce a quick, realistic BALLPARK ESTIMATE with price RANGES in USD. This is not a binding proposal — give honest low/high ranges that account for site unknowns. Write ALL human-readable text fields (scope_summary, timeline_text) in ${langName}. Numeric fields stay as numbers. Return ONLY valid JSON.`;

  const user = `CLIENT: ${opts.job.client_name}
ADDRESS: ${opts.job.job_address || "TBD"}${opts.job.job_state ? ", " + opts.job.job_state : ""}
TRADE: ${opts.job.trade_type || "general"}
JOB DESCRIPTION: ${opts.job.job_description}

Return this exact JSON shape with numbers only (no $ signs, no commas):
{
  "scope_summary": "1-2 short paragraphs summarizing what's included",
  "material_low": number,
  "material_high": number,
  "labor_low": number,
  "labor_high": number,
  "total_low": number,
  "total_high": number,
  "timeline_text": "e.g. 3-5 business days"
}

Rules:
- total_low must equal material_low + labor_low
- total_high must equal material_high + labor_high
- high should typically be 20-40% above low for an honest range
- Use realistic pricing for the trade and region`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Claude API ${res.status}: ${txt.slice(0, 400)}`);
  }
  const json: any = await res.json();
  const text: string = json?.content?.[0]?.text || "{}";
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const sliced = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(sliced) as EstimateAIShape;
}

export function languageName(code?: string | null): string {
  switch ((code || "en").toLowerCase()) {
    case "es": return "Spanish";
    case "fr": return "French";
    case "pt": return "Portuguese";
    case "ht": return "Haitian Creole";
    default: return "English";
  }
}

export function normalizeLanguage(raw: unknown): "en" | "es" | "fr" | "pt" | "ht" {
  const v = (raw ?? "").toString().toLowerCase().trim();
  // accept full names + common aliases
  if (/^es|spanish|espa/.test(v)) return "es";
  if (/^fr|french|fran/.test(v)) return "fr";
  if (/^pt|portuguese|portug/.test(v)) return "pt";
  if (/^ht|haitian|kreyol|creole/.test(v)) return "ht";
  return "en";
}

export function buildFallbackEstimate(opts: {
  contractor: { business_name: string; trade_type: string | null };
  job: { client_name: string; job_address: string | null; job_state: string | null; trade_type: string | null; job_description: string };
  language?: string | null;
}): EstimateAIShape {
  const lang = normalizeLanguage(opts.language);
  const trade = opts.job.trade_type || opts.contractor.trade_type || "roofing";
  const isRoofing = /roof/i.test(trade) || /shingle|flashing|roof/i.test(opts.job.job_description);
  const materialLow = isRoofing ? 1250 : 900;
  const materialHigh = isRoofing ? 2200 : 1700;
  const laborLow = isRoofing ? 1800 : 1400;
  const laborHigh = isRoofing ? 3200 : 2600;
  const summaries: Record<ReturnType<typeof normalizeLanguage>, string> = {
    en: `Ballpark estimate for ${opts.job.client_name}: includes site setup, standard materials, professional labor, cleanup, and final review for the requested ${trade} work. Final pricing may change after an on-site inspection, material selection, hidden conditions, and permit requirements are confirmed.`,
    es: `Estimación aproximada para ${opts.job.client_name}: incluye preparación del sitio, materiales estándar, mano de obra profesional, limpieza y revisión final para el trabajo solicitado de ${trade}. El precio final puede cambiar después de confirmar la inspección en sitio, la selección de materiales, condiciones ocultas y requisitos de permisos.`,
    fr: `Estimation approximative pour ${opts.job.client_name} : comprend la préparation du site, les matériaux standard, la main-d’œuvre professionnelle, le nettoyage et la revue finale pour les travaux de ${trade} demandés. Le prix final peut changer après inspection sur place, choix des matériaux, conditions cachées et exigences de permis.`,
    pt: `Estimativa aproximada para ${opts.job.client_name}: inclui preparação do local, materiais padrão, mão de obra profissional, limpeza e revisão final para o trabalho solicitado de ${trade}. O preço final pode mudar após vistoria no local, seleção de materiais, condições ocultas e requisitos de licença.`,
    ht: `Estimasyon apwoksimatif pou ${opts.job.client_name}: li enkli preparasyon sit la, materyèl estanda, men-dèv pwofesyonèl, netwayaj ak dènye revizyon pou travay ${trade} yo mande a. Pri final la ka chanje apre enspeksyon sou plas, chwa materyèl, kondisyon kache ak pèmi yo konfime.`,
  };
  const timelines: Record<ReturnType<typeof normalizeLanguage>, string> = {
    en: "Estimated 1-3 business days for typical repair work after scheduling and material availability are confirmed.",
    es: "Estimado de 1 a 3 días hábiles para reparaciones típicas después de confirmar la programación y disponibilidad de materiales.",
    fr: "Estimation de 1 à 3 jours ouvrables pour des réparations typiques après confirmation du calendrier et de la disponibilité des matériaux.",
    pt: "Estimativa de 1 a 3 dias úteis para reparos típicos após confirmação do agendamento e disponibilidade de materiais.",
    ht: "Estimasyon 1 a 3 jou ouvrab pou reparasyon nòmal apre yo konfime orè a ak disponiblite materyèl yo.",
  };
  return {
    scope_summary: summaries[lang],
    material_low: materialLow,
    material_high: materialHigh,
    labor_low: laborLow,
    labor_high: laborHigh,
    total_low: materialLow + laborLow,
    total_high: materialHigh + laborHigh,
    timeline_text: timelines[lang],
  };
}

export function generateEstimateNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EST-${y}${m}-${rand}`;
}

export async function upgradeEstimateToProposal(estimateId: string): Promise<{ proposal_id: string }> {
  const { data: est, error } = await supabaseAdmin
    .from("estimates").select("*").eq("id", estimateId).single();
  if (error || !est) throw new Error("Estimate not found");
  if (est.upgraded_to_proposal_id) return { proposal_id: est.upgraded_to_proposal_id };

  const { generateProposalNumber } = await import("@/lib/pricing");
  const validThrough = new Date();
  validThrough.setDate(validThrough.getDate() + 30);

  const { data: created, error: insErr } = await supabaseAdmin
    .from("proposals")
    .insert({
      contractor_id: est.contractor_id,
      proposal_number: generateProposalNumber(),
      status: "draft",
      source: "estimate_upgrade",
      client_name: est.client_name,
      client_email: est.client_email,
      client_phone: est.client_phone,
      job_address: est.job_address,
      job_state: est.job_state,
      trade_type: est.trade_type,
      job_description: est.scope_summary || "Upgraded from estimate",
      valid_through: validThrough.toISOString().slice(0, 10),
      language: est.language || "en",
      raw_input: { from_estimate: est.id },
    })
    .select("id")
    .single();
  if (insErr || !created) throw new Error(insErr?.message || "Failed to create proposal");

  await supabaseAdmin.from("estimates")
    .update({ status: "upgraded", upgraded_to_proposal_id: created.id })
    .eq("id", estimateId);

  return { proposal_id: created.id };
}