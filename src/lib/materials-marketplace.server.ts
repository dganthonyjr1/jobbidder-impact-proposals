/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * Materials Marketplace - 18 Contractor Disciplines
 * Contractor Discount System
 * Protected by U.S. Patent Application (Provisional) - June 23, 2026
 * ============================================================================
 */

import { createServerFn } from "@tanstack/start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export type ContractorDiscipline =
  | "glazing"
  | "roofing"
  | "electrical"
  | "plumbing"
  | "hvac"
  | "carpentry"
  | "masonry"
  | "painting"
  | "flooring"
  | "landscaping"
  | "concrete"
  | "drywall"
  | "insulation"
  | "siding"
  | "windows_doors"
  | "demolition"
  | "framing"
  | "finishing";

export type MaterialCategory =
  | "glazing"
  | "hardware"
  | "sealants"
  | "tools"
  | "safety"
  | "fasteners"
  | "adhesives"
  | "coatings"
  | "lumber"
  | "electrical"
  | "plumbing"
  | "hvac"
  | "insulation"
  | "roofing"
  | "flooring"
  | "paint"
  | "landscaping"
  | "concrete";

export type Material = {
  material_id: string;
  name: string;
  category: MaterialCategory;
  description: string;
  unit: string;
  retail_price: number;
  contractor_price: number;
  discount_percentage: number;
  disciplines: ContractorDiscipline[];
  in_stock: boolean;
  supplier: string;
  image_url: string | null;
  created_at: string;
};

/**
 * Contractor disciplines configuration
 */
export const CONTRACTOR_DISCIPLINES: Record<ContractorDiscipline, string> = {
  glazing: "Commercial Glazing",
  roofing: "Roofing",
  electrical: "Electrical",
  plumbing: "Plumbing",
  hvac: "HVAC",
  carpentry: "Carpentry",
  masonry: "Masonry",
  painting: "Painting",
  flooring: "Flooring",
  landscaping: "Landscaping",
  concrete: "Concrete",
  drywall: "Drywall",
  insulation: "Insulation",
  siding: "Siding",
  windows_doors: "Windows & Doors",
  demolition: "Demolition",
  framing: "Framing",
  finishing: "Finishing",
};

/**
 * Search materials marketplace
 * Returns materials available for contractor's discipline
 */
export const searchMaterials = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        contractor_discipline: z.enum([
          "glazing",
          "roofing",
          "electrical",
          "plumbing",
          "hvac",
          "carpentry",
          "masonry",
          "painting",
          "flooring",
          "landscaping",
          "concrete",
          "drywall",
          "insulation",
          "siding",
          "windows_doors",
          "demolition",
          "framing",
          "finishing",
        ]),
        search_query: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().default(50),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_discipline, search_query, category, limit } = input;

    let query = supabaseAdmin
      .from("marketplace_materials")
      .select("*")
      .contains("disciplines", [contractor_discipline])
      .eq("in_stock", true)
      .limit(limit);

    if (search_query) {
      query = query.ilike("name", `%${search_query}%`);
    }

    if (category) {
      query = query.eq("category", category);
    }

    const { data: materials, error } = await query;

    if (error) throw new Error("Failed to search materials");

    return {
      contractor_discipline,
      materials,
      total: materials.length,
    };
  });

/**
 * Get material details
 * Returns full material information including contractor pricing
 */
export const getMaterialDetails = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        material_id: z.string().uuid(),
        contractor_id: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { material_id, contractor_id } = input;

    // Get material
    const { data: material, error: material_error } = await supabaseAdmin
      .from("marketplace_materials")
      .select("*")
      .eq("id", material_id)
      .single();

    if (material_error) throw new Error("Material not found");

    // Get contractor's discount tier
    const { data: contractor, error: contractor_error } = await supabaseAdmin
      .from("contractor_applications")
      .select("discount_tier")
      .eq("id", contractor_id)
      .single();

    if (contractor_error) throw new Error("Contractor not found");

    // Calculate final price based on discount tier
    let final_price = material.contractor_price;
    if (contractor.discount_tier === "premium") {
      final_price = material.contractor_price * 0.95; // Additional 5% for premium
    } else if (contractor.discount_tier === "elite") {
      final_price = material.contractor_price * 0.9; // Additional 10% for elite
    }

    return {
      material_id,
      ...material,
      contractor_price: final_price,
      your_discount: (
        ((material.retail_price - final_price) / material.retail_price) *
        100
      ).toFixed(2),
    };
  });

/**
 * Add material to estimate
 * Adds material to contractor's estimate with contractor pricing
 */
export const addMaterialToEstimate = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        estimate_id: z.string().uuid(),
        material_id: z.string().uuid(),
        contractor_id: z.string().uuid(),
        quantity: z.number().min(1),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { estimate_id, material_id, contractor_id, quantity } = input;

    // Get material
    const { data: material, error: material_error } = await supabaseAdmin
      .from("marketplace_materials")
      .select("*")
      .eq("id", material_id)
      .single();

    if (material_error) throw new Error("Material not found");

    // Get contractor discount tier
    const { data: contractor, error: contractor_error } = await supabaseAdmin
      .from("contractor_applications")
      .select("discount_tier")
      .eq("id", contractor_id)
      .single();

    if (contractor_error) throw new Error("Contractor not found");

    // Calculate final price
    let unit_price = material.contractor_price;
    if (contractor.discount_tier === "premium") {
      unit_price = material.contractor_price * 0.95;
    } else if (contractor.discount_tier === "elite") {
      unit_price = material.contractor_price * 0.9;
    }

    const total_price = unit_price * quantity;

    // Add to estimate line items
    const { data: line_item, error: line_error } = await supabaseAdmin
      .from("estimate_line_items")
      .insert({
        estimate_id,
        material_id,
        description: material.name,
        quantity,
        unit: material.unit,
        unit_price,
        total_price,
        category: "material",
        source: "marketplace",
      })
      .select()
      .single();

    if (line_error) throw new Error("Failed to add material to estimate");

    return {
      line_item_id: line_item.id,
      material_name: material.name,
      quantity,
      unit_price,
      total_price,
      savings: (material.retail_price * quantity - total_price).toFixed(2),
    };
  });

/**
 * Get contractor discount tier
 * Returns current discount tier and benefits
 */
export const getContractorDiscountTier = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id } = input;

    const { data: contractor, error } = await supabaseAdmin
      .from("contractor_applications")
      .select("discount_tier, total_projects, total_revenue")
      .eq("id", contractor_id)
      .single();

    if (error) throw new Error("Contractor not found");

    const tier_benefits = {
      standard: {
        discount: "10-15%",
        benefits: ["Standard contractor pricing", "Access to marketplace"],
      },
      premium: {
        discount: "15-20%",
        benefits: [
          "Premium contractor pricing",
          "Priority support",
          "Bulk discounts",
          "Exclusive materials",
        ],
      },
      elite: {
        discount: "20-25%",
        benefits: [
          "Elite contractor pricing",
          "24/7 support",
          "Volume discounts",
          "Exclusive materials",
          "Custom pricing",
          "Direct supplier access",
        ],
      },
    };

    return {
      contractor_id,
      current_tier: contractor.discount_tier || "standard",
      benefits: tier_benefits[contractor.discount_tier || "standard"],
      total_projects: contractor.total_projects,
      total_revenue: contractor.total_revenue,
    };
  });

/**
 * Get popular materials by discipline
 * Returns trending materials for contractor's specialty
 */
export const getPopularMaterials = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        contractor_discipline: z.enum([
          "glazing",
          "roofing",
          "electrical",
          "plumbing",
          "hvac",
          "carpentry",
          "masonry",
          "painting",
          "flooring",
          "landscaping",
          "concrete",
          "drywall",
          "insulation",
          "siding",
          "windows_doors",
          "demolition",
          "framing",
          "finishing",
        ]),
        limit: z.number().default(10),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_discipline, limit } = input;

    const { data: materials, error } = await supabaseAdmin
      .from("marketplace_materials")
      .select("*")
      .contains("disciplines", [contractor_discipline])
      .eq("in_stock", true)
      .order("popularity_score", { ascending: false })
      .limit(limit);

    if (error) throw new Error("Failed to fetch popular materials");

    return {
      contractor_discipline,
      popular_materials: materials,
      total: materials.length,
    };
  });

/**
 * Create custom material request
 * Allows contractor to request specific materials
 */
export const requestCustomMaterial = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
        material_name: z.string(),
        description: z.string(),
        quantity_needed: z.number(),
        unit: z.string(),
        deadline: z.string().optional(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id, material_name, description, quantity_needed, unit, deadline } = input;

    const { data: request, error } = await supabaseAdmin
      .from("material_requests")
      .insert({
        contractor_id,
        material_name,
        description,
        quantity_needed,
        unit,
        deadline,
        status: "pending",
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error("Failed to create material request");

    // TODO: Notify suppliers of request

    return {
      request_id: request.id,
      status: "pending",
      message: "Material request submitted",
    };
  });

/**
 * Get material pricing history
 * Shows price trends for contractor
 */
export const getMaterialPricingHistory = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        material_id: z.string().uuid(),
        days: z.number().default(90),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { material_id, days } = input;

    const start_date = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: history, error } = await supabaseAdmin
      .from("material_pricing_history")
      .select("*")
      .eq("material_id", material_id)
      .gte("date", start_date)
      .order("date", { ascending: true });

    if (error) throw new Error("Failed to fetch pricing history");

    return {
      material_id,
      history,
      days,
    };
  });
