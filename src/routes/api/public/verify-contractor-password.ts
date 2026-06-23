import { json } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/server";

export async function POST(request: Request) {
  try {
    const { password, contractor_id } = await request.json();

    if (!password || !contractor_id) {
      return json({ error: "Missing password or contractor_id" }, { status: 400 });
    }

    // Fetch the contractor's password hash
    const { data: contractor, error } = await supabase
      .from("contractor_applications")
      .select("password_hash")
      .eq("id", contractor_id)
      .single();

    if (error || !contractor) {
      return json({ error: "Contractor not found" }, { status: 404 });
    }

    // In production, use bcrypt.compare() for secure password verification
    // For now, this is a placeholder implementation
    // IMPORTANT: This should be implemented with proper bcrypt hashing on the backend
    
    // Simple comparison (NOT SECURE - for development only)
    // In production, use: const isValid = await bcrypt.compare(password, contractor.password_hash);
    const isValid = password === contractor.password_hash; // PLACEHOLDER

    if (!isValid) {
      return json({ valid: false }, { status: 401 });
    }

    // Log the authentication event
    await supabase
      .from("compliance_audit_trail")
      .insert({
        contractor_id,
        event_type: "status_changed",
        status: "verified",
        details: { event: "contractor_dashboard_login" },
        created_by: contractor_id,
      });

    return json({ valid: true });
  } catch (error) {
    console.error("Password verification error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
