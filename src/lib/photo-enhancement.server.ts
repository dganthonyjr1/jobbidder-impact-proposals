import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import Replicate from "replicate";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type EnhancementProvider = "openai" | "claude" | "replicate" | "chatgpt";
export type EnhancementType =
  | "enhance"
  | "damage-assessment"
  | "auto-tag"
  | "auto-describe"
  | "upscale"
  | "background-removal"
  | "color-correction"
  | "detailed-report"
  | "proposal-generation";

interface EnhancementResult {
  provider: EnhancementProvider;
  type: EnhancementType;
  result: any;
  enhancedImageUrl?: string;
  metadata?: Record<string, any>;
  processingTime: number;
}

interface DamageAssessment {
  damageType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  estimatedRepairCost?: string;
  recommendations: string[];
}

/**
 * Photo Enhancement Service
 * Integrates with OpenAI Vision, Claude, ChatGPT, and Replicate for advanced photo processing
 */
export class PhotoEnhancer {
  private openai: OpenAI;
  private claude: Anthropic;
  private replicate: Replicate;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  /**
   * Analyze photo for damage using ChatGPT Vision
   */
  async analyzeDamageWithChatGPT(imageUrl: string): Promise<DamageAssessment> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
              {
                type: "text",
                text: `Analyze this photo for any visible damage. Provide a detailed assessment in JSON format with the following fields:
                {
                  "damageType": "type of damage (e.g., water damage, fire damage, structural damage, etc.)",
                  "severity": "low|medium|high|critical",
                  "description": "detailed description of the damage",
                  "estimatedRepairCost": "rough estimate if possible",
                  "recommendations": ["recommendation 1", "recommendation 2", ...]
                }
                If no damage is visible, set damageType to "none" and severity to "low".`,
              },
            ],
          },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No response from ChatGPT");

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse damage assessment");

      const assessment = JSON.parse(jsonMatch[0]) as DamageAssessment;
      return assessment;
    } catch (error) {
      console.error("ChatGPT damage analysis error:", error);
      throw new Error(
        `Damage analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate detailed report using ChatGPT Vision
   */
  async generateDetailedReportWithChatGPT(
    imageUrl: string,
    projectName?: string,
    contractorName?: string
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
              {
                type: "text",
                text: `Generate a professional damage assessment report for this photo. Include:
                1. Executive Summary
                2. Damage Assessment (type, severity, extent)
                3. Affected Areas
                4. Recommended Repairs
                5. Estimated Timeline
                6. Safety Concerns
                7. Next Steps
                
                Format as a professional report suitable for client presentation.
                ${projectName ? `Project: ${projectName}` : ""}
                ${contractorName ? `Contractor: ${contractorName}` : ""}`,
              },
            ],
          },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No response from ChatGPT");

      return content;
    } catch (error) {
      console.error("ChatGPT report generation error:", error);
      throw new Error(
        `Report generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate proposal text using ChatGPT Vision
   */
  async generateProposalWithChatGPT(
    imageUrl: string,
    projectType?: string,
    budget?: string
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
              {
                type: "text",
                text: `Based on this photo, generate a professional project proposal that includes:
                1. Project Overview
                2. Scope of Work (detailed line items)
                3. Materials Required
                4. Labor Estimate
                5. Timeline
                6. Quality Assurance
                7. Warranty Information
                8. Payment Terms
                
                Format as a professional proposal suitable for client presentation.
                ${projectType ? `Project Type: ${projectType}` : ""}
                ${budget ? `Budget Range: ${budget}` : ""}
                
                Include specific measurements and quantities where visible.`,
              },
            ],
          },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No response from ChatGPT");

      return content;
    } catch (error) {
      console.error("ChatGPT proposal generation error:", error);
      throw new Error(
        `Proposal generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Analyze photo for damage using Claude Vision
   */
  async analyzeDamageWithClaude(
    imageUrl: string
  ): Promise<DamageAssessment> {
    const startTime = Date.now();

    try {
      const response = await this.claude.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "url",
                  url: imageUrl,
                },
              },
              {
                type: "text",
                text: `Analyze this photo for any visible damage. Provide a detailed assessment in JSON format with the following fields:
                {
                  "damageType": "type of damage (e.g., water damage, fire damage, structural damage, etc.)",
                  "severity": "low|medium|high|critical",
                  "description": "detailed description of the damage",
                  "estimatedRepairCost": "rough estimate if possible",
                  "recommendations": ["recommendation 1", "recommendation 2", ...]
                }
                If no damage is visible, set damageType to "none" and severity to "low".`,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") throw new Error("Unexpected response type");

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse damage assessment");

      const assessment = JSON.parse(jsonMatch[0]) as DamageAssessment;
      return assessment;
    } catch (error) {
      console.error("Claude damage analysis error:", error);
      throw new Error(
        `Damage analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate auto-description using OpenAI Vision
   */
  async generateDescriptionWithOpenAI(imageUrl: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
              {
                type: "text",
                text: "Provide a detailed description of this image in 2-3 sentences.",
              },
            ],
          },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No response from OpenAI");

      return content;
    } catch (error) {
      console.error("OpenAI description error:", error);
      throw new Error(
        `Description generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Auto-tag photo using Claude
   */
  async autoTagWithClaude(imageUrl: string): Promise<string[]> {
    try {
      const response = await this.claude.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "url",
                  url: imageUrl,
                },
              },
              {
                type: "text",
                text: `Generate 5-10 relevant tags for this photo. Return only a JSON array of strings, like: ["tag1", "tag2", "tag3"]`,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") throw new Error("Unexpected response type");

      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Could not parse tags");

      return JSON.parse(jsonMatch[0]) as string[];
    } catch (error) {
      console.error("Claude tagging error:", error);
      throw new Error(
        `Auto-tagging failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Upscale image using Replicate
   */
  async upscaleWithReplicate(imageUrl: string): Promise<string> {
    try {
      const output = (await this.replicate.run(
        "nightmareai/real-esrgan:42fed498d5dd7f68f2161769a845e38b922d149be8d10cdf79326ec3d41d44a8",
        {
          input: {
            image: imageUrl,
            scale: 4,
          },
        }
      )) as string[];

      if (!output || output.length === 0) {
        throw new Error("No output from upscaling model");
      }

      return output[0];
    } catch (error) {
      console.error("Replicate upscaling error:", error);
      throw new Error(
        `Image upscaling failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Remove background using Replicate
   */
  async removeBackgroundWithReplicate(imageUrl: string): Promise<string> {
    try {
      const output = (await this.replicate.run(
        "cjwbw/rembg:fb9a7a23f16cea1615a34e4a0165109da5d1f0759532a775456bea551ff5550c",
        {
          input: {
            image: imageUrl,
          },
        }
      )) as string;

      if (!output) {
        throw new Error("No output from background removal model");
      }

      return output;
    } catch (error) {
      console.error("Replicate background removal error:", error);
      throw new Error(
        `Background removal failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Enhance image colors using Replicate
   */
  async enhanceColorsWithReplicate(imageUrl: string): Promise<string> {
    try {
      const output = (await this.replicate.run(
        "nightmareai/real-esrgan:42fed498d5dd7f68f2161769a845e38b922d149be8d10cdf79326ec3d41d44a8",
        {
          input: {
            image: imageUrl,
            scale: 1,
          },
        }
      )) as string[];

      if (!output || output.length === 0) {
        throw new Error("No output from enhancement model");
      }

      return output[0];
    } catch (error) {
      console.error("Replicate enhancement error:", error);
      throw new Error(
        `Color enhancement failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Process enhancement asynchronously
   */
  async processEnhancementAsync(
    mediaId: string,
    imageUrl: string,
    enhancementType: EnhancementType,
    provider: EnhancementProvider,
    userId: string
  ): Promise<void> {
    try {
      let result: any;
      let enhancedImageUrl: string | undefined;

      if (enhancementType === "damage-assessment" && provider === "claude") {
        result = await this.analyzeDamageWithClaude(imageUrl);
      } else if (
        enhancementType === "damage-assessment" &&
        provider === "chatgpt"
      ) {
        result = await this.analyzeDamageWithChatGPT(imageUrl);
      } else if (
        enhancementType === "auto-describe" &&
        provider === "openai"
      ) {
        result = await this.generateDescriptionWithOpenAI(imageUrl);
      } else if (enhancementType === "auto-tag" && provider === "claude") {
        result = await this.autoTagWithClaude(imageUrl);
      } else if (enhancementType === "upscale" && provider === "replicate") {
        enhancedImageUrl = await this.upscaleWithReplicate(imageUrl);
      } else if (
        enhancementType === "background-removal" &&
        provider === "replicate"
      ) {
        enhancedImageUrl = await this.removeBackgroundWithReplicate(imageUrl);
      } else if (
        enhancementType === "color-correction" &&
        provider === "replicate"
      ) {
        enhancedImageUrl = await this.enhanceColorsWithReplicate(imageUrl);
      } else if (
        enhancementType === "detailed-report" &&
        provider === "chatgpt"
      ) {
        result = await this.generateDetailedReportWithChatGPT(imageUrl);
      } else if (
        enhancementType === "proposal-generation" &&
        provider === "chatgpt"
      ) {
        result = await this.generateProposalWithChatGPT(imageUrl);
      } else {
        throw new Error(
          `Unsupported enhancement: ${enhancementType} with ${provider}`
        );
      }

      await supabaseAdmin
        .from("photo_enhancements")
        .insert({
          media_id: mediaId,
          user_id: userId,
          enhancement_type: enhancementType,
          provider,
          result,
          enhanced_image_url: enhancedImageUrl,
          status: "completed",
        });
    } catch (error) {
      console.error("Enhancement processing error:", error);

      await supabaseAdmin
        .from("photo_enhancements")
        .insert({
          media_id: mediaId,
          user_id: userId,
          enhancement_type: enhancementType,
          provider,
          status: "failed",
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        });
    }
  }

  /**
   * Get enhancement capabilities by provider
   */
  static getCapabilities() {
    return {
      openai: {
        name: "OpenAI Vision",
        capabilities: ["auto-describe", "auto-tag"],
        costPer1K: 0.01,
        speed: "fast",
      },
      chatgpt: {
        name: "ChatGPT (GPT-4 Vision)",
        capabilities: [
          "damage-assessment",
          "auto-describe",
          "auto-tag",
          "detailed-report",
          "proposal-generation",
        ],
        costPer1K: 0.015,
        speed: "medium",
      },
      claude: {
        name: "Claude 3.5 Sonnet",
        capabilities: ["damage-assessment", "auto-tag", "auto-describe"],
        costPer1K: 0.003,
        speed: "medium",
      },
      replicate: {
        name: "Replicate",
        capabilities: ["upscale", "background-removal", "color-correction"],
        costPerImage: 0.001,
        speed: "slow",
      },
    };
  }

  /**
   * Recommend best provider for enhancement type
   */
  static recommendProvider(
    enhancementType: EnhancementType
  ): EnhancementProvider {
    const recommendations: Record<EnhancementType, EnhancementProvider> = {
      "damage-assessment": "chatgpt",
      "auto-describe": "openai",
      "auto-tag": "claude",
      enhance: "replicate",
      upscale: "replicate",
      "background-removal": "replicate",
      "color-correction": "replicate",
      "detailed-report": "chatgpt",
      "proposal-generation": "chatgpt",
    };
    return recommendations[enhancementType];
  }
}
