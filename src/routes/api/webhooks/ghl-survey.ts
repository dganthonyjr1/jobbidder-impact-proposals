import { json } from "@tanstack/react-start";
import { getWebHandler } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { calculateContractorScore, type ContractorSurveyData } from "@/lib/contractor-scoring";

/**
 * GHL Webhook Receiver for Contractor Survey Responses
 * 
 * Receives webhook from GHL when contractor completes NGS survey
 * Calculates score and stores in Supabase
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface GhlWebhookPayload {
  type: string;
  locationId: string;
  contactId: string;
  contact?: {
    id: string;
    phone?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    customFields?: Array<{
      id: string;
      key: string;
      value: string;
    }>;
  };
  customData?: Record<string, unknown>;
  [key: string]: unknown;
}

function extractSurveyData(payload: GhlWebhookPayload): ContractorSurveyData | null {
  // Extract custom field values from GHL contact
  const customFields = payload.contact?.customFields || [];
  const fieldMap: Record<string, string> = {};

  customFields.forEach((field) => {
    fieldMap[field.key] = field.value;
  });

  // Check if survey is complete (all required fields present)
  const requiredFields = [
    "years_in_operation",
    "commercial_glazing_experience",
    "average_project_size",
    "window_film_experience",
    "crew_size",
    "osha_record",
    "availability",
    "surety_bond",
    "workers_comp",
  ];

  const hasAllFields = requiredFields.every((field) => fieldMap[field] !== undefined);
  if (!hasAllFields) {
    console.log("Survey incomplete, missing fields:", requiredFields.filter((f) => !fieldMap[f]));
    return null;
  }

  // Parse states_licensed (could be comma-separated or array)
  let statesLicensed: string[] = [];
  const statesStr = fieldMap["states_licensed"] || "";
  if (Array.isArray(statesStr)) {
    statesLicensed = statesStr;
  } else if (typeof statesStr === "string") {
    statesLicensed = statesStr.split(",").map((s) => s.trim());
  }

  return {
    yearsInOperation: parseInt(fieldMap["years_in_operation"] || "0", 10),
    commercialGlazingExperience: parseInt(fieldMap["commercial_glazing_experience"] || "0", 10),
    averageProjectSize: fieldMap["average_project_size"] || "",
    windowFilmExperience: parseInt(fieldMap["window_film_experience"] || "0", 10),
    crewSize: parseInt(fieldMap["crew_size"] || "0", 10),
    statesLicensed,
    oshaRecord: fieldMap["osha_record"] || "",
    availability: fieldMap["availability"] || "",
    suretyBond: fieldMap["surety_bond"] || "",
    workersComp: fieldMap["workers_comp"] || "",
  };
}

export const POST = getWebHandler(async (event) => {
  try {
    const payload: GhlWebhookPayload = await event.request.json();

    console.log("GHL Webhook received:", {
      type: payload.type,
      contactId: payload.contactId,
      locationId: payload.locationId,
    });

    // Extract survey data from webhook
    const surveyData = extractSurveyData(payload);
    if (!surveyData) {
      console.log("Survey data incomplete, skipping");
      return json({ ok: true, message: "Survey incomplete" }, { status: 200 });
    }

    // Calculate score
    const scoringResult = calculateContractorScore(surveyData);

    // Find or create contractor in database
    const { data: existingContractor } = await supabase
      .from("contractor_applications")
      .select("id")
      .eq("ghl_contact_id", payload.contactId)
      .single()
      .catch(() => ({ data: null }));

    let contractorId: string;

    if (existingContractor) {
      contractorId = existingContractor.id;
      // Update existing contractor
      const { error: updateError } = await supabase
        .from("contractor_applications")
        .update({
          years_in_operation: surveyData.yearsInOperation,
          commercial_glazing_experience: surveyData.commercialGlazingExperience,
          average_project_size: surveyData.averageProjectSize,
          window_film_experience: surveyData.windowFilmExperience,
          crew_size: surveyData.crewSize,
          states_licensed: surveyData.statesLicensed,
          osha_record: surveyData.oshaRecord,
          availability: surveyData.availability,
          surety_bond: surveyData.suretyBond,
          workers_comp: surveyData.workersComp,
          qualification_score: scoringResult.totalScore,
          qualification_percentage: scoringResult.percentage,
          qualification_status: scoringResult.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contractorId);

      if (updateError) throw updateError;
    } else {
      // Create new contractor
      const { data: newContractor, error: createError } = await supabase
        .from("contractor_applications")
        .insert({
          ghl_contact_id: payload.contactId,
          name: `${payload.contact?.firstName || ""} ${payload.contact?.lastName || ""}`.trim(),
          phone: payload.contact?.phone || "",
          email: payload.contact?.email || "",
          trade_type: "Commercial Glazing",
          years_in_operation: surveyData.yearsInOperation,
          commercial_glazing_experience: surveyData.commercialGlazingExperience,
          average_project_size: surveyData.averageProjectSize,
          window_film_experience: surveyData.windowFilmExperience,
          crew_size: surveyData.crewSize,
          states_licensed: surveyData.statesLicensed,
          osha_record: surveyData.oshaRecord,
          availability: surveyData.availability,
          surety_bond: surveyData.suretyBond,
          workers_comp: surveyData.workersComp,
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
    const { error: surveyError } = await supabase
      .from("contractor_survey_responses")
      .insert({
        contractor_id: contractorId,
        years_in_operation: surveyData.yearsInOperation,
        commercial_glazing_experience: surveyData.commercialGlazingExperience,
        average_project_size: surveyData.averageProjectSize,
        window_film_experience: surveyData.windowFilmExperience,
        crew_size: surveyData.crewSize,
        states_licensed: surveyData.statesLicensed,
        osha_record: surveyData.oshaRecord,
        availability: surveyData.availability,
        surety_bond: surveyData.suretyBond,
        workers_comp: surveyData.workersComp,
        total_score: scoringResult.totalScore,
        percentage: scoringResult.percentage,
        status: scoringResult.status,
        completed_at: new Date().toISOString(),
      });

    if (surveyError) throw surveyError;

    console.log("Survey processed successfully:", {
      contractorId,
      score: scoringResult.totalScore,
      status: scoringResult.status,
    });

    return json(
      {
        ok: true,
        contractorId,
        score: scoringResult.totalScore,
        percentage: scoringResult.percentage,
        status: scoringResult.status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});
