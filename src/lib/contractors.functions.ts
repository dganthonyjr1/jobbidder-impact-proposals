import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listContractorApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("contractor_applications")
      .select(
        "id, name, phone, email, trade_type, years_experience, service_area, license_number, license_url, insurance_url, status, notes, created_at, ghl_contact_id"
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateContractorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["submitted", "approved", "rejected", "pending_docs"]),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("contractor_applications")
      .update({ status: data.status, notes: data.notes ?? null, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
