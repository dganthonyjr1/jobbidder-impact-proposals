import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { extractFeatures, predictWinProbability, type TrainedModel } from "@/lib/pricing-model.server";

const QuerySchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/public/proposal")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let input: z.infer<typeof QuerySchema>;
        try {
          input = QuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
        } catch (e) {
          return Response.json(
            { success: false, error: "Invalid proposal link", details: (e as Error).message },
            { status: 400 },
          );
        }

        const { data: proposal, error: proposalError } = await supabaseAdmin
          .from("proposals")
          .select("*")
          .eq("id", input.id)
          .maybeSingle();

        if (proposalError || !proposal) {
          return Response.json({ success: false, error: "Proposal not found" }, { status: 404 });
        }

        const { data: contractor } = proposal.contractor_id
          ? await supabaseAdmin
              .from("contractors")
              .select("id, user_id, business_name, phone, email, logo_url, primary_color")
              .eq("id", proposal.contractor_id)
              .maybeSingle()
          : { data: null };

        let winProbability: { probability: number; sampleSize: number } | null = null;
        try {
          const { data: snapshot } = await supabaseAdmin
            .from("pricing_model_snapshots")
            .select("feature_names, feature_means, feature_stds, weights, intercept, sample_size")
            .order("trained_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (snapshot) {
            const model: TrainedModel = {
              featureNames: snapshot.feature_names,
              featureMeans: snapshot.feature_means as unknown as number[],
              featureStds: snapshot.feature_stds as unknown as number[],
              weights: snapshot.weights as unknown as number[],
              intercept: snapshot.intercept,
              sampleSize: snapshot.sample_size,
            };
            const features = extractFeatures({
              trade_type: proposal.trade_type,
              overhead_percentage: proposal.overhead_percentage,
              materials: proposal.materials as any,
              labor: proposal.labor as any,
              tax_rate: proposal.tax_rate,
            });
            winProbability = { probability: predictWinProbability(features, model), sampleSize: model.sampleSize };
          }
        } catch (e) {
          console.warn("[proposal] win-probability lookup failed:", (e as Error).message);
        }

        return Response.json({ success: true, proposal, contractor, winProbability });
      },
    },
  },
});