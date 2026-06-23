import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { calculateContractorScore, type ContractorSurveyData } from "@/lib/contractor-scoring";
import { sendSmsViaGHL, type GhlCredentials } from "@/lib/ghl.server";

type JsonRecord = Record<string, any>;

function custom(body: JsonRecord, ...keys: string[]): any {
  const sources = [
    body.custom_fields,
    body.customFields,
    body.customField,
    body.contact?.customFields,
    body.contact?.custom_fields,
  ];
  for (const source of sources) {
    if (!source) continue;
    if (Array.isArray(source)) {
      for (const item of source) {
        const key = String(item?.key || item?.name || item?.fieldKey || item?.id || "").toLowerCase();
        if (keys.map((k) => k.toLowerCase()).includes(key)) return item?.value ?? item?.field_value;
      }
    } else if (typeof source === "object") {
      for (const key of keys) {
        if (source[key] != null) return source[key];
        const match = Object.keys(source).find((k) => k.toLowerCase() === key.toLowerCase());
        if (match) return source[match];
      }
    }
  }
  return null;
}

function firstString(...values: any[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function cors(headers: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    ...headers,
  };
}

function normalizePhoneNumber(phone: string | null): string | null {
  if (!phone) return null;
  
  // Extract only digits
  const digitsOnly = phone.replace(/\D/g, "");
  if (!digitsOnly) return null;
  
  // If 10 digits (US), add +1
  if (digitsOnly.length === 10) {
    return "+1" + digitsOnly;
  }
  
  // If 11 digits and starts with 1 (US), convert to +1
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return "+" + digitsOnly;
  }
  
  // If already has country code, add +
  if (digitsOnly.length > 10) {
    return "+" + digitsOnly;
  }
  
  // Default: assume US and add +1
  return "+1" + digitsOnly;
}

export const Route = createFileRoute("/api/public/webhook/ghl-contractor-survey")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: JsonRecord = await request.json().catch(() => ({}));

          console.log("[webhook.ghl-contractor-survey] Received webhook:", {
            contactId: body.contactId || body.contact?.id,
            type: body.type,
          });

          // Extract contact info
          const contactId = body.contactId || body.contact?.id;
          const contactName = firstString(
            body.contact?.name,
            [body.contact?.firstName, body.contact?.lastName].filter(Boolean).join(" "),
            body.name,
            body.full_name
          );
          const contactEmail = firstString(body.contact?.email, body.email);
          const rawContactPhone = firstString(body.contact?.phone, body.contact?.phoneNumber, body.phone);
          const contactPhone = normalizePhoneNumber(rawContactPhone);

          // Extract survey responses from custom fields
          const yearsInOperation = parseInt(custom(body, "years_in_operation", "yearsInOperation") || "0", 10);
          const commercialGlazingExperience = parseInt(custom(body, "commercial_glazing_experience", "commercialGlazingExperience") || "0", 10);
          const averageProjectSize = custom(body, "average_project_size", "averageProjectSize") || "";
          const windowFilmExperience = parseInt(custom(body, "window_film_experience", "windowFilmExperience") || "0", 10);
          const crewSize = parseInt(custom(body, "crew_size", "crewSize") || "0", 10);
          const statesLicensedStr = custom(body, "states_licensed", "statesLicensed") || "";
          const oshaRecord = custom(body, "osha_record", "oshaRecord") || "";
          const availability = custom(body, "availability") || "";
          const suretyBond = custom(body, "surety_bond", "suretyBond") || "";
          const workersComp = custom(body, "workers_comp", "workersComp") || "";

          // Check if survey is complete
          if (!yearsInOperation || !commercialGlazingExperience || !averageProjectSize) {
            console.log("[webhook.ghl-contractor-survey] Survey incomplete, skipping");
            return Response.json({ ok: true, message: "Survey incomplete" }, { status: 200, headers: cors() });
          }

          // Parse states
          let statesLicensed: string[] = [];
          if (Array.isArray(statesLicensedStr)) {
            statesLicensed = statesLicensedStr;
          } else if (typeof statesLicensedStr === "string") {
            statesLicensed = statesLicensedStr.split(",").map((s) => s.trim());
          }

          // Calculate score
          const surveyData: ContractorSurveyData = {
            yearsInOperation,
            commercialGlazingExperience,
            averageProjectSize,
            windowFilmExperience,
            crewSize,
            statesLicensed,
            oshaRecord,
            availability,
            suretyBond,
            workersComp,
          };

          const scoringResult = calculateContractorScore(surveyData);

          // Find or create contractor
          let contractorId: string;
          const { data: existingContractor, error: lookupError } = await supabaseAdmin
            .from("contractor_applications")
            .select("id")
            .eq("ghl_contact_id", contactId)
            .single();
          
          if (lookupError && lookupError.code !== "PGRST116") {
            throw lookupError;
          }

          if (existingContractor) {
            contractorId = existingContractor.id;
            // Update existing
            const { error: updateError } = await supabaseAdmin
              .from("contractor_applications")
              .update({
                years_in_operation: yearsInOperation,
                commercial_glazing_experience: commercialGlazingExperience,
                average_project_size: averageProjectSize,
                window_film_experience: windowFilmExperience,
                crew_size: crewSize,
                states_licensed: statesLicensed,
                osha_record: oshaRecord,
                availability,
                surety_bond: suretyBond,
                workers_comp: workersComp,
                qualification_score: scoringResult.totalScore,
                qualification_percentage: scoringResult.percentage,
                qualification_status: scoringResult.status,
                updated_at: new Date().toISOString(),
              })
              .eq("id", contractorId);

            if (updateError) throw updateError;
          } else {
            // Create new
            const { data: newContractor, error: createError } = await supabaseAdmin
              .from("contractor_applications")
              .insert({
                ghl_contact_id: contactId,
                name: contactName || "Unknown",
                phone: contactPhone || "",
                email: contactEmail || "",
                trade_type: "Commercial Glazing",
                years_in_operation: yearsInOperation,
                commercial_glazing_experience: commercialGlazingExperience,
                average_project_size: averageProjectSize,
                window_film_experience: windowFilmExperience,
                crew_size: crewSize,
                states_licensed: statesLicensed,
                osha_record: oshaRecord,
                availability,
                surety_bond: suretyBond,
                workers_comp: workersComp,
                qualification_score: scoringResult.totalScore,
                qualification_percentage: scoringResult.percentage,
                qualification_status: scoringResult.status,
                status: "submitted",
                agrees_to_terms: true,
              })
              .select("id")
              .single();

            if (createError) throw createError;
            contractorId = newContractor!.id;
          }

          // Save survey response
          const { error: surveyError } = await supabaseAdmin
            .from("contractor_survey_responses")
            .insert({
              contractor_id: contractorId,
              years_in_operation: yearsInOperation,
              commercial_glazing_experience: commercialGlazingExperience,
              average_project_size: averageProjectSize,
              window_film_experience: windowFilmExperience,
              crew_size: crewSize,
              states_licensed: statesLicensed,
              osha_record: oshaRecord,
              availability,
              surety_bond: suretyBond,
              workers_comp: workersComp,
              total_score: scoringResult.totalScore,
              percentage: scoringResult.percentage,
              status: scoringResult.status,
              completed_at: new Date().toISOString(),
            });

          if (surveyError) throw surveyError;

          console.log("[webhook.ghl-contractor-survey] Survey processed:", {
            contractorId,
            score: scoringResult.totalScore,
            status: scoringResult.status,
          });

          // Send SMS notification to contractor
          let smsResult: any = { skipped: true, reason: "No phone number" };
          if (contactPhone && contactPhone.length > 0) {
            try {
              const ghlToken = process.env.GHL_API_TOKEN;
              const ghlLocationId = process.env.GHL_LOCATION_ID;
              
              if (ghlToken && ghlLocationId) {
                const ghlCredentials: GhlCredentials = {
                  apiToken: ghlToken,
                  locationId: ghlLocationId,
                  fromNumber: process.env.GHL_SMS_FROM_NUMBER,
                };

                const statusMessage = scoringResult.status === "APPROVED" 
                  ? "✅ APPROVED! Your contractor profile qualifies. Next: Review and sign agreement."
                  : "⏳ PENDING REVIEW. Your profile scored " + scoringResult.totalScore + "/120. We'll follow up shortly.";

                smsResult = await sendSmsViaGHL({
                  to: contactPhone || "",
                  body: `Jobbidder NGS Survey Complete - Score: ${scoringResult.totalScore}/120 (${Math.round(scoringResult.percentage)}%). ${statusMessage}`,
                  contactName: contactName || "Contractor",
                  contactEmail: contactEmail,
                  tags: ["jobbidder", "ngs-survey", `score-${scoringResult.status.toLowerCase()}`],
                  credentials: ghlCredentials,
                });
                
                // Log SMS result but don't fail the webhook
                if (!smsResult.ok) {
                  console.warn("[webhook.ghl-contractor-survey] SMS send failed (non-critical):", smsResult.error || smsResult.message);
                }
              }
            } catch (smsError) {
              console.warn("[webhook.ghl-contractor-survey] SMS send error (non-critical):", smsError);
              smsResult = { skipped: true, reason: smsError instanceof Error ? smsError.message : "Unknown error" };
            }
          } else {
            smsResult = { skipped: true, reason: "No phone number provided" };
          }

          return Response.json(
            {
              ok: true,
              contractorId,
              score: scoringResult.totalScore,
              percentage: scoringResult.percentage,
              status: scoringResult.status,
              sms: smsResult,
            },
            { status: 200, headers: cors() }
          );
        } catch (error) {
          console.error("[webhook.ghl-contractor-survey] Error:", error);
          return Response.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500, headers: cors() }
          );
        }
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),
    },
  },
});
