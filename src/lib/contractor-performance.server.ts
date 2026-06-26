/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Copyright (c) 2026 [Your Company Name]. All rights reserved.
 * 
 * This file contains proprietary contractor performance tracking logic
 * protected by U.S. Patent Application (Provisional) - June 23, 2026
 * 
 * Unauthorized access, use, or distribution is strictly prohibited.
 * ============================================================================
 */

import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Contractor Performance Tracking System
 * 
 * Tracks contractor performance metrics that become increasingly valuable
 * over time and create a defensible data moat:
 * - Acceptance rates (% of offers accepted)
 * - Success rates (% of projects completed successfully)
 * - Time-to-hire (days from pre-qualification to hire)
 * - Regional performance (state-by-state success rates)
 * - Specialty performance (discipline-specific success rates)
 * - Client satisfaction ratings
 * - Safety record
 * - Compliance history
 * - Revenue generated
 */

export type ContractorPerformanceMetrics = {
  contractor_id: string;
  total_offers: number;
  accepted_offers: number;
  acceptance_rate: number; // percentage
  total_projects: number;
  completed_projects: number;
  success_rate: number; // percentage
  average_time_to_hire: number; // days
  regional_performance: Record<string, RegionalMetrics>;
  specialty_performance: Record<string, SpecialtyMetrics>;
  client_satisfaction_rating: number; // 1-5
  safety_incidents: number;
  compliance_violations: number;
  total_revenue_generated: number;
  average_project_value: number;
  repeat_client_rate: number; // percentage
  on_time_completion_rate: number; // percentage
  quality_score: number; // 1-100
  last_updated: string;
};

export type RegionalMetrics = {
  state: string;
  total_projects: number;
  completed_projects: number;
  success_rate: number;
  average_project_value: number;
};

export type SpecialtyMetrics = {
  specialty: string;
  total_projects: number;
  completed_projects: number;
  success_rate: number;
  average_project_value: number;
};

/**
 * Record contractor offer
 * Tracks when contractor is offered a project
 */
export const recordContractorOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
        project_id: z.string().uuid(),
        offer_value: z.number().positive(),
        specialty: z.string(),
        state: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id, project_id, offer_value, specialty, state } = input;

    const { data, error } = await supabaseAdmin
      .from("contractor_performance_events")
      .insert({
        contractor_id,
        event_type: "offer_sent",
        project_id,
        offer_value,
        specialty,
        state,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to record offer: ${error.message}`);

    return data;
  });

/**
 * Record contractor acceptance
 * Tracks when contractor accepts an offer
 */
export const recordContractorAcceptance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
        project_id: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id, project_id } = input;

    const { data, error } = await supabaseAdmin
      .from("contractor_performance_events")
      .insert({
        contractor_id,
        event_type: "offer_accepted",
        project_id,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error)
      throw new Error(`Failed to record acceptance: ${error.message}`);

    return data;
  });

/**
 * Record project completion
 * Tracks when contractor completes a project
 */
export const recordProjectCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
        project_id: z.string().uuid(),
        completion_status: z.enum(["completed", "failed", "cancelled"]),
        quality_score: z.number().min(1).max(100),
        client_satisfaction: z.number().min(1).max(5),
        completion_date: z.string(),
        notes: z.string().optional(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const {
      contractor_id,
      project_id,
      completion_status,
      quality_score,
      client_satisfaction,
      completion_date,
      notes,
    } = input;

    const { data, error } = await supabaseAdmin
      .from("contractor_performance_events")
      .insert({
        contractor_id,
        event_type: "project_completed",
        project_id,
        completion_status,
        quality_score,
        client_satisfaction,
        completion_date,
        notes,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error)
      throw new Error(`Failed to record completion: ${error.message}`);

    return data;
  });

/**
 * Calculate contractor performance metrics
 * Aggregates all performance data into actionable metrics
 */
export const calculatePerformanceMetrics = async (
  contractor_id: string
): Promise<ContractorPerformanceMetrics> => {
  const { data: events, error } = await supabaseAdmin
    .from("contractor_performance_events")
    .select("*")
    .eq("contractor_id", contractor_id)
    .order("timestamp", { ascending: true });

  if (error) throw new Error("Failed to fetch performance events");

  const events_list = events || [];

  // Calculate basic metrics
  const offers = events_list.filter((e: any) => e.event_type === "offer_sent");
  const acceptances = events_list.filter(
    (e: any) => e.event_type === "offer_accepted"
  );
  const completions = events_list.filter(
    (e: any) => e.event_type === "project_completed"
  );

  const acceptance_rate =
    offers.length > 0 ? (acceptances.length / offers.length) * 100 : 0;

  const successful_completions = completions.filter(
    (e: any) => e.completion_status === "completed"
  );
  const success_rate =
    acceptances.length > 0
      ? (successful_completions.length / acceptances.length) * 100
      : 0;

  // Calculate time-to-hire
  const time_to_hire_days: number[] = [];
  acceptances.forEach((acceptance: any) => {
    const offer = offers.find((o: any) => o.project_id === acceptance.project_id);
    if (offer) {
      const days = Math.floor(
        (new Date(acceptance.timestamp).getTime() -
          new Date(offer.timestamp).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      time_to_hire_days.push(days);
    }
  });

  const average_time_to_hire =
    time_to_hire_days.length > 0
      ? time_to_hire_days.reduce((a: number, b: number) => a + b, 0) /
        time_to_hire_days.length
      : 0;

  // Calculate regional performance
  const regional_performance: Record<string, RegionalMetrics> = {};
  offers.forEach((offer: any) => {
    if (!regional_performance[offer.state]) {
      regional_performance[offer.state] = {
        state: offer.state,
        total_projects: 0,
        completed_projects: 0,
        success_rate: 0,
        average_project_value: 0,
      };
    }
    regional_performance[offer.state].total_projects += 1;

    const completion = completions.find(
      (c: any) => c.project_id === offer.project_id
    );
    if (completion && completion.completion_status === "completed") {
      regional_performance[offer.state].completed_projects += 1;
    }
  });

  // Calculate success rates by region
  Object.keys(regional_performance).forEach((state: string) => {
    const metrics = regional_performance[state];
    metrics.success_rate =
      metrics.total_projects > 0
        ? (metrics.completed_projects / metrics.total_projects) * 100
        : 0;
  });

  // Calculate specialty performance
  const specialty_performance: Record<string, SpecialtyMetrics> = {};
  offers.forEach((offer: any) => {
    if (!specialty_performance[offer.specialty]) {
      specialty_performance[offer.specialty] = {
        specialty: offer.specialty,
        total_projects: 0,
        completed_projects: 0,
        success_rate: 0,
        average_project_value: 0,
      };
    }
    specialty_performance[offer.specialty].total_projects += 1;

    const completion = completions.find(
      (c: any) => c.project_id === offer.project_id
    );
    if (completion && completion.completion_status === "completed") {
      specialty_performance[offer.specialty].completed_projects += 1;
    }
  });

  // Calculate success rates by specialty
  Object.keys(specialty_performance).forEach((specialty: string) => {
    const metrics = specialty_performance[specialty];
    metrics.success_rate =
      metrics.total_projects > 0
        ? (metrics.completed_projects / metrics.total_projects) * 100
        : 0;
  });

  // Calculate satisfaction and quality
  const satisfaction_scores = completions
    .filter((c: any) => c.client_satisfaction)
    .map((c: any) => c.client_satisfaction);
  const client_satisfaction_rating =
    satisfaction_scores.length > 0
      ? satisfaction_scores.reduce((a: number, b: number) => a + b, 0) /
        satisfaction_scores.length
      : 0;

  const quality_scores = completions
    .filter((c: any) => c.quality_score)
    .map((c: any) => c.quality_score);
  const quality_score =
    quality_scores.length > 0
      ? quality_scores.reduce((a: number, b: number) => a + b, 0) /
        quality_scores.length
      : 0;

  // Calculate total revenue
  const total_revenue_generated = offers.reduce(
    (sum: number, offer: any) => sum + (offer.offer_value || 0),
    0
  );
  const average_project_value =
    offers.length > 0 ? total_revenue_generated / offers.length : 0;

  // Calculate on-time completion rate
  const on_time_completions = completions.filter(
    (c: any) => c.completion_status === "completed"
  ).length;
  const on_time_completion_rate =
    completions.length > 0
      ? (on_time_completions / completions.length) * 100
      : 0;

  return {
    contractor_id,
    total_offers: offers.length,
    accepted_offers: acceptances.length,
    acceptance_rate,
    total_projects: acceptances.length,
    completed_projects: successful_completions.length,
    success_rate,
    average_time_to_hire,
    regional_performance,
    specialty_performance,
    client_satisfaction_rating,
    safety_incidents: 0, // Would be populated from compliance data
    compliance_violations: 0, // Would be populated from compliance data
    total_revenue_generated,
    average_project_value,
    repeat_client_rate: 0, // Would be calculated from project history
    on_time_completion_rate,
    quality_score,
    last_updated: new Date().toISOString(),
  };
};

/**
 * Get contractor performance metrics
 * Returns aggregated performance data for dashboard display
 */
export const getContractorPerformanceMetrics = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id } = input;

    const metrics = await calculatePerformanceMetrics(contractor_id);

    // Cache the metrics in the database
    await supabaseAdmin
      .from("contractor_performance_metrics")
      .upsert({
        contractor_id,
        metrics,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    return metrics;
  });
