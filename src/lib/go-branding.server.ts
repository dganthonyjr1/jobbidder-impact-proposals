import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WHITE_LABEL_TIERS = ["master_gc", "principal", "enterprise"];

export type ContractorBranding = {
  slug: string;
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
};

export const getBrandingBySlug = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }): Promise<ContractorBranding | null> => {
    const { data: c } = await supabaseAdmin
      .from("contractors")
      .select("slug, business_name, logo_url, primary_color, subscription_tier")
      .eq("slug", slug)
      .maybeSingle();

    if (!c || !WHITE_LABEL_TIERS.includes(c.subscription_tier ?? "")) return null;

    return {
      slug: c.slug as string,
      businessName: (c.business_name as string) || "Your Estimator",
      logoUrl: c.logo_url as string | null,
      primaryColor: (c.primary_color as string) || "#10b981",
    };
  });
