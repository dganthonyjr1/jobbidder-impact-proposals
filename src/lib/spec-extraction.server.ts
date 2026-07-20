import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const inputSchema = z.object({
  path: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255),
});

export type ExtractedSystem = { name: string; description: string; unit_hint: string };

const EXTRACTION_PROMPT = `You are a construction estimator's assistant reviewing an architectural spec or scope-of-work document (this may be a full CSI MasterFormat section covering several systems at once).

Enumerate EVERY DISTINCT scope-of-work system described in this document. Do not summarize multiple systems into one entry — a document covering, say, roof membrane, canopy, gutters, downspouts, drip edge, and coping should produce six separate systems, not one "roofing" system.

For each system give:
- "name": a short system name (e.g. "TPO Membrane & Underlayment", "Corrugated Metal Canopy")
- "description": 1-3 sentences summarizing what that system's scope includes per the document
- "unit_hint": the most natural unit of measure for pricing it (e.g. "sq ft", "linear ft", "each")

Return ONLY valid JSON matching exactly this shape, with no other text:
{ "systems": [ { "name": string, "description": string, "unit_hint": string } ] }`;

export const extractSpecSystems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Document extraction is not configured — ANTHROPIC_API_KEY missing");

    const { data: file, error: downloadError } = await supabaseAdmin.storage
      .from("proposal-specs")
      .download(data.path);
    if (downloadError || !file) {
      throw new Error(`Could not read uploaded file: ${downloadError?.message || "not found"}`);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const fileBase64 = Buffer.from(bytes).toString("base64");

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileBase64 } },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    const raw = textBlock?.text || "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    let systems: ExtractedSystem[] = [];
    try {
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
      if (Array.isArray(parsed.systems)) systems = parsed.systems;
    } catch {
      console.error(`[extractSpecSystems] Failed to parse Claude response for ${data.fileName}. Raw text: ${raw.slice(0, 1000)}`);
      throw new Error("Could not parse the extracted systems — try again or edit the job description manually.");
    }

    console.log(`[extractSpecSystems] Extracted ${systems.length} system(s) from ${data.fileName}: ${systems.map((s) => s.name).join(", ")}`);

    // Best-effort cleanup — the uploaded spec file only exists to drive this
    // one extraction; nothing downstream reads it back from storage.
    await supabaseAdmin.storage.from("proposal-specs").remove([data.path]).catch(() => {});

    return { systems, fileName: data.fileName };
  });
