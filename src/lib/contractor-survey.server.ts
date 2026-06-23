import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { calculateContractorScore, type ContractorSurveyData } from "./contractor-scoring";

const surveyResponseSchema = z.object({
  contractorId: z.string().uuid(),
  yearsInOperation: z.number().min(0).max(100),
  commercialGlazingExperience: z.number().min(0).max(100),
  averageProjectSize: z.string(),
  windowFilmExperience: z.number().min(0).max(100),
  crewSize: z.number().min(1).max(1000),
  statesLicensed: z.array(z.string()),
  oshaRecord: z.string(),
  availability: z.string(),
  suretyBond: z.string(),
  workersComp: z.string(),
});

export const saveContractorSurveyResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => surveyResponseSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    // Calculate score using NGS algorithm
    const surveyData: ContractorSurveyData = {
      yearsInOperation: data.yearsInOperation,
      commercialGlazingExperience: data.commercialGlazingExperience,
      averageProjectSize: data.averageProjectSize,
      windowFilmExperience: data.windowFilmExperience,
      crewSize: data.crewSize,
      statesLicensed: data.statesLicensed,
      oshaRecord: data.oshaRecord,
      availability: data.availability,
      suretyBond: data.suretyBond,
      workersComp: data.workersComp,
    };

    const scoringResult = calculateContractorScore(surveyData);

    // Save to contractor_survey_responses table
    const { data: surveyRecord, error: surveyError } = await supabase
      .from("contractor_survey_responses")
      .insert({
        contractor_id: data.contractorId,
        years_in_operation: data.yearsInOperation,
        commercial_glazing_experience: data.commercialGlazingExperience,
        average_project_size: data.averageProjectSize,
        window_film_experience: data.windowFilmExperience,
        crew_size: data.crewSize,
        states_licensed: data.statesLicensed,
        osha_record: data.oshaRecord,
        availability: data.availability,
        surety_bond: data.suretyBond,
        workers_comp: data.workersComp,
        total_score: scoringResult.totalScore,
        percentage: scoringResult.percentage,
        status: scoringResult.status,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (surveyError) throw new Error(surveyError.message);

    // Update contractor_applications with latest score
    const { error: updateError } = await supabase
      .from("contractor_applications")
      .update({
        years_in_operation: data.yearsInOperation,
        commercial_glazing_experience: data.commercialGlazingExperience,
        average_project_size: data.averageProjectSize,
        window_film_experience: data.windowFilmExperience,
        crew_size: data.crewSize,
        states_licensed: data.statesLicensed,
        osha_record: data.oshaRecord,
        availability: data.availability,
        surety_bond: data.suretyBond,
        workers_comp: data.workersComp,
        qualification_score: scoringResult.totalScore,
        qualification_percentage: scoringResult.percentage,
        qualification_status: scoringResult.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.contractorId);

    if (updateError) throw new Error(updateError.message);

    return {
      ok: true,
      surveyId: surveyRecord?.id,
      score: scoringResult.totalScore,
      percentage: scoringResult.percentage,
      status: scoringResult.status,
      breakdown: scoringResult.breakdown,
    };
  });

export const getContractorSurveyScore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ contractorId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    const { data: contractor, error } = await supabase
      .from("contractor_applications")
      .select(
        "id, qualification_score, qualification_percentage, qualification_status, years_in_operation, commercial_glazing_experience, average_project_size, window_film_experience, crew_size, states_licensed, osha_record, availability, surety_bond, workers_comp"
      )
      .eq("id", data.contractorId)
      .single();

    if (error) throw new Error(error.message);
    if (!contractor) throw new Error("Contractor not found");

    return {
      contractorId: contractor.id,
      score: contractor.qualification_score,
      percentage: contractor.qualification_percentage,
      status: contractor.qualification_status,
      surveyData: {
        yearsInOperation: contractor.years_in_operation,
        commercialGlazingExperience: contractor.commercial_glazing_experience,
        averageProjectSize: contractor.average_project_size,
        windowFilmExperience: contractor.window_film_experience,
        crewSize: contractor.crew_size,
        statesLicensed: contractor.states_licensed,
        oshaRecord: contractor.osha_record,
        availability: contractor.availability,
        suretyBond: contractor.surety_bond,
        workersComp: contractor.workers_comp,
      },
    };
  });
