import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { extractFeatures, trainLogisticRegression, FEATURE_NAMES } from "@/lib/pricing-model.server";

const MIN_SAMPLE_SIZE = 20;

async function runTraining() {
  const { data: proposals, error } = await supabaseAdmin
    .from("proposals")
    .select("status, trade_type, overhead_percentage, materials, labor, tax_rate")
    .in("status", ["accepted", "declined"]);

  if (error) throw new Error(error.message);

  const rows = (proposals || []).map((p) => ({
    features: extractFeatures({
      trade_type: p.trade_type,
      overhead_percentage: p.overhead_percentage,
      materials: p.materials as any,
      labor: p.labor as any,
      tax_rate: p.tax_rate,
    }),
    label: (p.status === "accepted" ? 1 : 0) as 0 | 1,
  }));

  if (rows.length < MIN_SAMPLE_SIZE) {
    return { trained: false, reason: `Only ${rows.length} decided proposals — need ${MIN_SAMPLE_SIZE}+ to train.` };
  }

  const model = trainLogisticRegression(rows);

  const { error: insertError } = await supabaseAdmin.from("pricing_model_snapshots").insert({
    sample_size: model.sampleSize,
    feature_names: FEATURE_NAMES,
    feature_means: model.featureMeans,
    feature_stds: model.featureStds,
    weights: model.weights,
    intercept: model.intercept,
  });
  if (insertError) throw new Error(insertError.message);

  return { trained: true, sampleSize: model.sampleSize };
}

export const Route = createFileRoute("/api/public/hooks/train-pricing-model")({
  server: {
    handlers: {
      // Vercel Cron sends GET; support both so it can also be triggered manually.
      GET: async () => {
        try {
          const result = await runTraining();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("[train-pricing-model] failed:", (e as Error).message);
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
      POST: async () => {
        try {
          const result = await runTraining();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("[train-pricing-model] failed:", (e as Error).message);
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
