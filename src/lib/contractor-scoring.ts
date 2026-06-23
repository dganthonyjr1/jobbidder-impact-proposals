/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Copyright (c) 2026 [Your Company Name]. All rights reserved.
 * 
 * This file contains proprietary algorithms and trade secrets protected by:
 * - U.S. Patent Application (Provisional) - June 23, 2026
 * - Copyright Law
 * - Trade Secret Protection
 * 
 * Unauthorized access, use, or distribution is strictly prohibited.
 * ============================================================================
 */

/*
 * NGS Contractor Qualification Scoring System
 * 10-question survey with 120-point maximum score
 */

export type ContractorSurveyData = {
  yearsInOperation: number;
  commercialGlazingExperience: number;
  averageProjectSize: string; // e.g., "$75K-$150K"
  windowFilmExperience: number;
  crewSize: number;
  statesLicensed: string[]; // e.g., ["CA", "NV", "AZ"]
  oshaRecord: string; // e.g., "Perfect - no incidents"
  availability: string; // e.g., "Full-time, immediate"
  suretyBond: string; // e.g., "Yes - $500K"
  workersComp: string; // e.g., "Yes - full coverage"
};

export type ScoringResult = {
  totalScore: number;
  maxScore: number;
  percentage: number;
  status: "APPROVED" | "PENDING_REVIEW" | "REJECTED";
  breakdown: {
    yearsInOperation: number;
    commercialGlazing: number;
    projectSize: number;
    windowFilm: number;
    crewSize: number;
    statesLicensed: "Manual Review" | number;
    oshaRecord: number;
    availability: number;
    suretyBond: number;
    workersComp: number;
  };
};

/**
 * Calculate contractor qualification score based on NGS 10-question survey
 * Scoring: 70%+ = APPROVED, <70% = PENDING_REVIEW
 */
export function calculateContractorScore(data: ContractorSurveyData): ScoringResult {
  let totalScore = 0;
  const breakdown = {
    yearsInOperation: 0,
    commercialGlazing: 0,
    projectSize: 0,
    windowFilm: 0,
    crewSize: 0,
    statesLicensed: "Manual Review" as const,
    oshaRecord: 0,
    availability: 0,
    suretyBond: 0,
    workersComp: 0,
  };

  // Q1: Years in operation (0-20 pts)
  breakdown.yearsInOperation = Math.min(20, Math.round((data.yearsInOperation / 20) * 20));
  totalScore += breakdown.yearsInOperation;

  // Q2: Commercial glazing experience (0-20 pts)
  breakdown.commercialGlazing = Math.min(20, Math.round((data.commercialGlazingExperience / 20) * 20));
  totalScore += breakdown.commercialGlazing;

  // Q3: Average project size (0-20 pts)
  if (data.averageProjectSize.includes("$75K") || data.averageProjectSize.includes("$150K")) {
    breakdown.projectSize = 20;
  } else if (data.averageProjectSize.includes("$50K") || data.averageProjectSize.includes("$100K")) {
    breakdown.projectSize = 15;
  } else if (data.averageProjectSize.includes("$25K")) {
    breakdown.projectSize = 10;
  } else if (data.averageProjectSize.includes("$10K")) {
    breakdown.projectSize = 4;
  } else {
    breakdown.projectSize = 0;
  }
  totalScore += breakdown.projectSize;

  // Q4: Window film experience (0-10 pts)
  breakdown.windowFilm = Math.min(10, Math.round((data.windowFilmExperience / 10) * 10));
  totalScore += breakdown.windowFilm;

  // Q5: Crew size (0-10 pts) - scale to 12 as reference
  breakdown.crewSize = Math.min(10, Math.round((data.crewSize / 12) * 10));
  totalScore += breakdown.crewSize;

  // Q6: States licensed (Manual Review)
  breakdown.statesLicensed = "Manual Review";
  // Don't add to score - requires manual review

  // Q7: OSHA/Safety record (0-10 pts)
  if (data.oshaRecord.toLowerCase().includes("perfect")) {
    breakdown.oshaRecord = 10;
  } else if (data.oshaRecord.toLowerCase().includes("minor")) {
    breakdown.oshaRecord = 4;
  } else {
    breakdown.oshaRecord = 0;
  }
  totalScore += breakdown.oshaRecord;

  // Q8: Availability (0-10 pts)
  if (data.availability.toLowerCase().includes("full-time")) {
    breakdown.availability = 10;
  } else if (data.availability.toLowerCase().includes("part-time")) {
    breakdown.availability = 4;
  } else {
    breakdown.availability = 0;
  }
  totalScore += breakdown.availability;

  // Q9: Surety Bond status (0-10 pts)
  breakdown.suretyBond = data.suretyBond.toLowerCase().includes("yes") ? 10 : 0;
  totalScore += breakdown.suretyBond;

  // Q10: Workers' Comp insurance (0-10 pts)
  if (data.workersComp.toLowerCase().includes("full")) {
    breakdown.workersComp = 10;
  } else if (data.workersComp.toLowerCase().includes("basic")) {
    breakdown.workersComp = 4;
  } else {
    breakdown.workersComp = 0;
  }
  totalScore += breakdown.workersComp;

  const maxScore = 120;
  const percentage = (totalScore / maxScore) * 100;
  const status = percentage >= 70 ? "APPROVED" : "PENDING_REVIEW";

  return {
    totalScore,
    maxScore,
    percentage,
    status,
    breakdown,
  };
}
