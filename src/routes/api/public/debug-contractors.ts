import { json } from "@tanstack/start";
import { createAPIFileRoute } from "@tanstack/start/api";
import { createClient } from "@supabase/supabase-js";

export const APIRoute = createAPIFileRoute("/api/public/debug-contractors")({
  GET: async () => {
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";

      if (!supabaseUrl || !supabaseKey) {
        return json({ error: "Missing Supabase credentials", SUPABASE_URL: !!process.env.SUPABASE_URL, VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL, SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE_KEY }, { status: 500 });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from("contractors")
        .select("id, business_name, email, slug, created_at")
        .limit(10);

      return json({
        supabaseUrlPrefix: supabaseUrl.substring(0, 30),
        contractors: data,
        error: error?.message,
        count: data?.length,
      });
    } catch (err: any) {
      return json({ error: err.message }, { status: 500 });
    }
  },
});
