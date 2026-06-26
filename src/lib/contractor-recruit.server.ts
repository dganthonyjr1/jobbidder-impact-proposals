/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Copyright (c) 2026 [Your Company Name]. All rights reserved.
 * Trade Secret — Unauthorized use or distribution is strictly prohibited.
 * ============================================================================
 *
 * Contractor Recruitment Engine — Full NGS Service Niche Coverage
 *
 * Covers every service category on ngs.inc:
 *   Design · Installation · Grant Assistance · Project Management ·
 *   Continuing Education · Building Perimeter Hardening · Production ·
 *   Building Modeling / Energy Engineering · Sustainability ·
 *   National Retail Rollouts
 *
 * Plus sub-specialties:
 *   Window Film · Commercial Glazing · Residential Windows · Auto Glass ·
 *   Shower / Bath Glass · Mirror Installation · Storefront / Curtain Wall ·
 *   Security / Blast-Resistant Glazing · Glass Fabrication · Energy Modeling ·
 *   LEED / Sustainability Consulting · Retail Rollout Field Crews
 *
 * Flow:
 *   External source → POST /api/public/contractor-recruit
 *   → detect niche → validate state → upsert GHL contact (niche-tagged)
 *   → trigger GHL_HIRING_AGENT_WORKFLOW_ID → send niche-specific invite
 *   → store in contractor_recruits
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  sendSmsViaGHL,
  sendEmailViaGHL,
  triggerGhlWorkflow,
} from "@/lib/ghl.server";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** States where NGS currently operates. Override via env for flexibility. */
export const NGS_STATES: readonly string[] = (
  process.env.NGS_OPERATING_STATES
    ? process.env.NGS_OPERATING_STATES.split(",").map((s) => s.trim().toUpperCase())
    : ["CA", "NV", "AZ", "TX"]
) as string[];

// ---------------------------------------------------------------------------
// NGS Service Niche Registry
// ---------------------------------------------------------------------------
// Each entry maps to one of the 10 service categories on ngs.inc, plus
// sub-specialties that fall under each. The `keywords` array is used for
// fuzzy trade-type matching when the caller doesn't supply an explicit niche.
// ---------------------------------------------------------------------------

export type NgsNiche = {
  /** Slug used in GHL tags and DB storage, e.g. "window-film-installation" */
  id: string;
  /** Human-readable label shown in invite messages */
  label: string;
  /** Canonical ngs.inc service category this falls under */
  parentService: string;
  /** Keywords to match against incoming trade_type strings (case-insensitive) */
  keywords: string[];
  /** Short description of what contractors in this niche do */
  roleDescription: string;
};

export const NGS_SERVICE_NICHES: NgsNiche[] = [
  // ── Installation sub-specialties ──────────────────────────────────────────
  {
    id: "window-film-installation",
    label: "Window Film Installation",
    parentService: "Installation",
    keywords: [
      "window film", "solar film", "security film", "decorative film",
      "film installer", "film installation", "tint", "tinting", "window tint",
      "solar control film", "llumar", "3m film", "sun control", "uv film",
    ],
    roleDescription: "install commercial and residential window film systems",
  },
  {
    id: "commercial-glazing",
    label: "Commercial Glazing",
    parentService: "Installation",
    keywords: [
      "commercial glazing", "glazier", "glazing", "curtain wall", "storefront",
      "glass wall", "glass facade", "spandrel glass", "commercial glass",
      "structural glazing", "unitized curtain wall", "stick-built curtain wall",
    ],
    roleDescription: "install commercial glazing, storefronts, and curtain wall systems",
  },
  {
    id: "glass-installation",
    label: "Glass Installation",
    parentService: "Installation",
    keywords: [
      "glass installation", "glass installer", "glass replacement",
      "architectural glass", "interior glass", "glass partition",
      "tempered glass", "laminated glass", "insulated glass unit", "igt",
    ],
    roleDescription: "install architectural and specialty glass systems",
  },
  {
    id: "residential-windows",
    label: "Residential Windows & Doors",
    parentService: "Installation",
    keywords: [
      "residential windows", "window installation", "window replacement",
      "patio door", "sliding glass door", "home windows", "residential glazing",
      "french door", "storefront residential", "impact window",
    ],
    roleDescription: "install residential windows, glass doors, and fenestration systems",
  },
  {
    id: "shower-bath-glass",
    label: "Shower / Bath Glass",
    parentService: "Installation",
    keywords: [
      "shower glass", "frameless shower", "shower enclosure", "bath glass",
      "tub surround", "glass shower door", "semi-frameless shower",
    ],
    roleDescription: "install frameless and semi-frameless shower enclosures",
  },
  {
    id: "mirror-installation",
    label: "Mirror Installation",
    parentService: "Installation",
    keywords: [
      "mirror installation", "mirror installer", "commercial mirror",
      "decorative mirror", "gym mirror", "bathroom mirror",
    ],
    roleDescription: "install commercial and residential mirrors",
  },
  {
    id: "auto-glass",
    label: "Auto Glass",
    parentService: "Installation",
    keywords: [
      "auto glass", "windshield", "windshield replacement", "auto tinting",
      "vehicle glass", "car glass", "auto glass technician", "adas calibration",
    ],
    roleDescription: "replace and install auto glass and vehicle film",
  },

  // ── Building Perimeter Hardening ───────────────────────────────────────────
  {
    id: "building-perimeter-hardening",
    label: "Building Perimeter Hardening",
    parentService: "Building Perimeter Hardening",
    keywords: [
      "perimeter hardening", "blast resistant", "blast film", "blast mitigation",
      "security glazing", "anti-shatter film", "ballistic glass", "bullet-resistant",
      "forced entry resistant", "attack resistant", "safety film", "gsa film",
      "dos film", "government security glazing", "dos level",
    ],
    roleDescription: "install security film and blast-resistant glazing systems",
  },
  {
    id: "security-film",
    label: "Security Film Installation",
    parentService: "Building Perimeter Hardening",
    keywords: [
      "security film", "safety and security film", "fragment retention film",
      "anti-graffiti film", "smash-and-grab", "robbery deterrent film",
    ],
    roleDescription: "install security and fragment-retention window film",
  },

  // ── Design ─────────────────────────────────────────────────────────────────
  {
    id: "glazing-design",
    label: "Glazing / Fenestration Design",
    parentService: "Design",
    keywords: [
      "glazing design", "fenestration design", "architectural design",
      "glass design", "facade design", "cad glazing", "revit glazing",
      "shop drawings", "submittal drawings", "glazing engineer",
    ],
    roleDescription: "produce glazing designs, shop drawings, and submittal packages",
  },

  // ── Building Modeling / Energy Engineering ─────────────────────────────────
  {
    id: "energy-modeling",
    label: "Building Modeling / Energy Engineering",
    parentService: "Building Modeling / Energy Engineering",
    keywords: [
      "energy modeling", "building modeling", "energy engineering",
      "building performance", "thermal modeling", "daylighting analysis",
      "equest", "energyplus", "ies-ve", "trace", "doe-2", "energy simulation",
      "window u-value", "shgc analysis", "title 24", "ashrae",
    ],
    roleDescription: "perform building energy modeling and glazing performance analysis",
  },

  // ── Sustainability ─────────────────────────────────────────────────────────
  {
    id: "sustainability-consulting",
    label: "Sustainability Consulting",
    parentService: "Sustainability",
    keywords: [
      "sustainability", "leed", "leed consultant", "leed ap", "green building",
      "sustainable glazing", "well certified", "living building", "net zero",
      "carbon neutral", "energy star", "green globes", "sustainability consultant",
    ],
    roleDescription: "provide LEED certification and green building consulting",
  },

  // ── Production / Fabrication ───────────────────────────────────────────────
  {
    id: "glass-fabrication",
    label: "Glass Fabrication & Production",
    parentService: "Production",
    keywords: [
      "glass fabrication", "glass cutting", "fabricator", "glass cutter",
      "tempering", "tempered glass production", "laminating", "laminated glass",
      "insulated glass", "ig unit", "glass processing", "production technician",
      "glass shop", "film cutting", "film fabrication",
    ],
    roleDescription: "fabricate and process glass and film products in a production environment",
  },

  // ── Project Management ─────────────────────────────────────────────────────
  {
    id: "project-management",
    label: "Project Management",
    parentService: "Project Management",
    keywords: [
      "project management", "project manager", "construction management",
      "field supervisor", "site supervisor", "construction coordinator",
      "glazing project manager", "pm glazing", "superintendent",
    ],
    roleDescription: "manage glazing and film installation projects from kickoff to closeout",
  },

  // ── National Retail Rollouts ───────────────────────────────────────────────
  {
    id: "national-retail-rollouts",
    label: "National Retail Rollouts",
    parentService: "National Retail Rollouts",
    keywords: [
      "retail rollout", "national rollout", "retail installation",
      "retail glazing", "storefront rollout", "multi-site", "multi-location",
      "chain store", "retail film", "franchise rollout", "corporate rollout",
    ],
    roleDescription: "execute multi-location retail glazing and film rollouts nationwide",
  },

  // ── Grant Assistance ───────────────────────────────────────────────────────
  {
    id: "energy-grant-consulting",
    label: "Energy Grant / Incentive Consulting",
    parentService: "Grant Assistance",
    keywords: [
      "grant assistance", "energy grant", "utility rebate", "c-pace", "pace financing",
      "energy incentive", "sce rebate", "pge rebate", "doe grant",
      "federal tax credit", "energy efficiency grant", "stimulus glazing",
    ],
    roleDescription: "assist clients with energy efficiency grants, utility rebates, and C-PACE financing",
  },
];

// ---------------------------------------------------------------------------
// Niche detection helpers
// ---------------------------------------------------------------------------

/** Returns the best-matching NgsNiche for a given trade string, or null. */
export function detectNiche(
  trade: string | null | undefined,
  nicheOverride?: string | null,
): NgsNiche | null {
  // Explicit niche supplied — find by id
  if (nicheOverride) {
    const found = NGS_SERVICE_NICHES.find((n) => n.id === nicheOverride.toLowerCase().trim());
    if (found) return found;
  }
  if (!trade) return null;
  const lc = trade.toLowerCase();
  // Score each niche by how many keywords match
  let best: NgsNiche | null = null;
  let bestScore = 0;
  for (const niche of NGS_SERVICE_NICHES) {
    let score = 0;
    for (const kw of niche.keywords) {
      if (lc.includes(kw)) score += kw.split(" ").length; // longer match = higher score
    }
    if (score > bestScore) {
      bestScore = score;
      best = niche;
    }
  }
  return bestScore > 0 ? best : null;
}

/** Returns true if the trade matches any NGS niche. */
export function isNgsTrade(
  trade: string | null | undefined,
  nicheOverride?: string | null,
): boolean {
  return detectNiche(trade, nicheOverride) !== null;
}

export function isNgsState(state: string | null | undefined): boolean {
  if (!state) return false;
  return NGS_STATES.includes(state.trim().toUpperCase());
}

/** All accepted niche IDs for API validation. */
export const NGS_NICHE_IDS = NGS_SERVICE_NICHES.map((n) => n.id);

// ---------------------------------------------------------------------------
// Recruit input / result types
// ---------------------------------------------------------------------------

export type RecruitInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  trade_type?: string | null;
  /** Explicit niche ID (e.g. "window-film-installation"). Auto-detected from trade_type if omitted. */
  niche?: string | null;
  service_state?: string | null;   // 2-letter state code, e.g. "CA"
  source?: string | null;          // 'api' | 'manual' | 'licensing_board' | 'referral'
  source_ref?: string | null;      // external record ID from originating system
  notes?: string | null;
  /** Skip trade/state validation (admin override) */
  force?: boolean;
};

export type RecruitResult =
  | {
      ok: true;
      recruit_id: string;
      niche_id: string;
      niche_label: string;
      ghl_contact_id?: string;
      invite_method: string;
    }
  | { ok: false; error: string; code?: string };

// ---------------------------------------------------------------------------
// Core recruit function
// ---------------------------------------------------------------------------

export async function recruitContractor(input: RecruitInput): Promise<RecruitResult> {
  const stateLabel = input.service_state?.trim().toUpperCase() || "";
  const niche = detectNiche(input.trade_type, input.niche);

  // --- Validate eligibility -------------------------------------------------
  if (!input.force) {
    if (!niche) {
      const nicheList = NGS_SERVICE_NICHES.map((n) => `"${n.label}"`).join(", ");
      return {
        ok: false,
        error:
          `Trade "${input.trade_type}" does not match any NGS service niche. ` +
          `Accepted niches: ${nicheList}. Supply "niche" field to override.`,
        code: "TRADE_NOT_ELIGIBLE",
      };
    }
    if (!isNgsState(stateLabel)) {
      return {
        ok: false,
        error: `State "${stateLabel}" is outside NGS operating states (${NGS_STATES.join(", ")}).`,
        code: "STATE_NOT_COVERED",
      };
    }
  }

  const resolvedNiche = niche ?? {
    id: "general",
    label: "Glass & Glazing Solutions",
    parentService: "Installation",
    keywords: [],
    roleDescription: "perform skilled glass and glazing work",
  };

  const firstName = input.name.split(" ")[0];
  const applyUrl = `${process.env.VITE_SITE_URL || "https://jobbidder.io"}/contractor-apply`;

  // --- Build GHL tags -------------------------------------------------------
  const tags = [
    "ngs-recruit",
    `ngs-niche:${resolvedNiche.id}`,
    `ngs-service:${resolvedNiche.parentService.toLowerCase().replace(/[\s/]+/g, "-")}`,
    ...(stateLabel ? [`state:${stateLabel}`] : []),
    ...(input.trade_type
      ? [`trade:${input.trade_type.toLowerCase().replace(/\s+/g, "-")}`]
      : []),
    `source:${input.source || "api"}`,
  ].filter(Boolean);

  let ghlContactId: string | undefined;
  let inviteMethod = "none";

  // --- SMS invite -----------------------------------------------------------
  if (input.phone) {
    const smsBody = buildSmsInvite({ firstName, niche: resolvedNiche, state: stateLabel, applyUrl });

    const smsResult = await sendSmsViaGHL({
      to: input.phone,
      body: smsBody,
      contactName: input.name,
      contactEmail: input.email || undefined,
      tags,
    });

    if (smsResult.ok) {
      inviteMethod = "sms";
    } else {
      console.warn("[contractor-recruit] SMS invite failed:", smsResult.error);
    }
  }

  // --- Email invite ---------------------------------------------------------
  if (input.email) {
    const subject = buildEmailSubject({ niche: resolvedNiche, state: stateLabel });
    const html = buildInviteEmailHtml({ firstName, niche: resolvedNiche, state: stateLabel, applyUrl });
    const text = buildEmailText({ firstName, niche: resolvedNiche, state: stateLabel, applyUrl });

    const emailResult = await sendEmailViaGHL({
      to: input.email,
      subject,
      html,
      text,
      contactName: input.name,
      contactPhone: input.phone,
      tags,
    });

    if (emailResult.ok) {
      inviteMethod = inviteMethod === "sms" ? "both" : "email";
    } else {
      console.warn("[contractor-recruit] Email invite failed:", emailResult.error);
    }
  }

  // --- Trigger GHL hiring-agent workflow ------------------------------------
  const workflowId = process.env.GHL_HIRING_AGENT_WORKFLOW_ID;
  if (workflowId && ghlContactId) {
    triggerGhlWorkflow({ contactId: ghlContactId, workflowId }).catch((e) =>
      console.warn("[contractor-recruit] Workflow trigger failed:", e?.message),
    );
  }

  // --- Store in contractor_recruits -----------------------------------------
  const { data: inserted, error: dbErr } = await supabaseAdmin
    .from("contractor_recruits")
    .insert({
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      trade_type: input.trade_type || resolvedNiche.label,
      service_niche: resolvedNiche.id,
      service_state: stateLabel || null,
      source: input.source || "api",
      source_ref: input.source_ref || null,
      ghl_contact_id: ghlContactId || null,
      invite_sent_at: inviteMethod !== "none" ? new Date().toISOString() : null,
      invite_method: inviteMethod,
      status: "invited",
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (dbErr) {
    return { ok: false, error: dbErr.message };
  }

  return {
    ok: true,
    recruit_id: inserted.id,
    niche_id: resolvedNiche.id,
    niche_label: resolvedNiche.label,
    ghl_contact_id: ghlContactId,
    invite_method: inviteMethod,
  };
}

// ---------------------------------------------------------------------------
// Bulk recruit
// ---------------------------------------------------------------------------

export type BulkRecruitResult = {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  results: Array<{ name: string; result: RecruitResult }>;
};

export async function bulkRecruitContractors(
  contractors: RecruitInput[],
): Promise<BulkRecruitResult> {
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  const results: BulkRecruitResult["results"] = [];

  for (const c of contractors) {
    await new Promise((r) => setTimeout(r, 400)); // GHL rate-limit buffer

    const result = await recruitContractor(c);
    results.push({ name: c.name, result });

    if (result.ok) {
      succeeded++;
    } else if (result.code === "TRADE_NOT_ELIGIBLE" || result.code === "STATE_NOT_COVERED") {
      skipped++;
    } else {
      failed++;
    }
  }

  return { total: contractors.length, succeeded, skipped, failed, results };
}

// ---------------------------------------------------------------------------
// Invite message builders
// ---------------------------------------------------------------------------

function buildSmsInvite(opts: {
  firstName: string;
  niche: NgsNiche;
  state: string;
  applyUrl: string;
}): string {
  const { firstName, niche, state, applyUrl } = opts;
  return (
    `Hi ${firstName}! NGS (National Glazing Solutions Inc) is hiring skilled contractors ` +
    `to ${niche.roleDescription} in ${state}. ` +
    `Join our network — apply in 2 min: ${applyUrl} ` +
    `Questions? Reply to this message.`
  );
}

function buildEmailSubject(opts: { niche: NgsNiche; state: string }): string {
  return `${opts.niche.label} opportunity in ${opts.state} — National Glazing Solutions Inc`;
}

function buildEmailText(opts: {
  firstName: string;
  niche: NgsNiche;
  state: string;
  applyUrl: string;
}): string {
  const { firstName, niche, state, applyUrl } = opts;
  return [
    `Hi ${firstName},`,
    "",
    `National Glazing Solutions Inc (NGS) is actively recruiting contractors to ${niche.roleDescription} in ${state}.`,
    "",
    `NGS is a national leader in ${niche.parentService.toLowerCase()} services, serving commercial, ` +
      `government, retail, and residential clients across California, Nevada, Arizona, and Texas.`,
    "",
    `Apply now (takes 2 minutes): ${applyUrl}`,
    "",
    `Questions? Reply to this email and our hiring team will respond promptly.`,
    "",
    "— The NGS Hiring Team",
  ].join("\n");
}

function buildInviteEmailHtml(opts: {
  firstName: string;
  niche: NgsNiche;
  state: string;
  applyUrl: string;
}): string {
  const { firstName, niche, state, applyUrl } = opts;
  const stateNames: Record<string, string> = {
    CA: "California", NV: "Nevada", AZ: "Arizona", TX: "Texas",
    FL: "Florida", NY: "New York", WA: "Washington", CO: "Colorado",
    OR: "Oregon", GA: "Georgia", NC: "North Carolina", IL: "Illinois",
  };
  const stateName = stateNames[state] || state;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;background:#fff;">

  <div style="text-align:center;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #1d4ed8;">
    <h1 style="font-size:24px;font-weight:700;color:#1d4ed8;margin:0 0 4px;">National Glazing Solutions Inc</h1>
    <p style="color:#64748b;font-size:13px;margin:0;">ngs.inc &nbsp;·&nbsp; Powered by <strong>Jobbidder.io</strong></p>
  </div>

  <p style="font-size:16px;margin-bottom:8px;">Hi ${firstName},</p>

  <p style="font-size:15px;line-height:1.7;margin-bottom:16px;">
    NGS is actively recruiting experienced <strong>${niche.label}</strong> contractors
    in <strong>${stateName}</strong>. We'd love to have you join our skilled contractor network.
  </p>

  <div style="background:#f0f9ff;border-left:4px solid #1d4ed8;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:20px;">
    <p style="font-size:14px;font-weight:600;color:#1e3a8a;margin:0 0 6px;">What you'll do:</p>
    <p style="font-size:14px;color:#1e40af;margin:0;">
      As an NGS contractor, you'll ${niche.roleDescription} as part of our
      <strong>${niche.parentService}</strong> service team.
    </p>
  </div>

  <p style="font-size:15px;line-height:1.7;margin-bottom:24px;">
    NGS is a national leader in glass, glazing, and building performance solutions —
    serving commercial, government, retail, and residential clients across CA, NV, AZ, and TX.
    Our contractor network handles everything from storefront installs to large-scale
    national retail rollouts and building perimeter hardening projects.
  </p>

  <div style="text-align:center;margin:32px 0;">
    <a href="${applyUrl}"
       style="background:#1d4ed8;color:#fff;padding:16px 40px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:700;display:inline-block;letter-spacing:0.3px;">
      Apply Now — Takes 2 Minutes
    </a>
  </div>

  <p style="font-size:14px;color:#64748b;text-align:center;">
    Questions? Simply reply to this email — our hiring team responds within one business day.
  </p>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px;">
  <p style="font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">
    National Glazing Solutions Inc (NGS) &nbsp;·&nbsp; ngs.inc &nbsp;·&nbsp; Jobbidder.io<br>
    You received this because your license or profile matches our open <strong>${niche.label}</strong>
    contractor position in ${stateName}.
  </p>

</body>
</html>`.trim();
}
