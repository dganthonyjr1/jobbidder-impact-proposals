import { json } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PhotoEnhancer, EnhancementType, EnhancementProvider } from "@/lib/photo-enhancement.server";

const EnhanceSchema = z.object({
  mediaId: z.string().uuid(),
  enhancementType: z.enum([
    "enhance",
    "damage-assessment",
    "auto-tag",
    "auto-describe",
    "upscale",
    "background-removal",
    "color-correction",
  ]),
  provider: z.enum(["openai", "claude", "replicate"]).optional(),
});

export async function POST(req: Request) {
  try {
    // Get user ID from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = EnhanceSchema.parse(body);

    // Get media record
    const { data: media, error: mediaError } = await supabaseAdmin
      .from("photos_videos")
      .select("*")
      .eq("id", data.mediaId)
      .eq("user_id", user.id)
      .single();

    if (mediaError || !media) {
      return json({ error: "Media not found" }, { status: 404 });
    }

    // Determine provider if not specified
    const provider = data.provider || PhotoEnhancer.recommendProvider(data.enhancementType as EnhancementType);

    // Create enhancement record with pending status
    const { data: enhancement, error: enhancementError } = await supabaseAdmin
      .from("photo_enhancements")
      .insert({
        media_id: data.mediaId,
        user_id: user.id,
        enhancement_type: data.enhancementType,
        provider,
        status: "processing",
      })
      .select()
      .single();

    if (enhancementError) {
      throw new Error(enhancementError.message);
    }

    // Process enhancement asynchronously (fire and forget)
    const enhancer = new PhotoEnhancer();
    enhancer.processEnhancementAsync(
      data.mediaId,
      media.storage_url,
      data.enhancementType as EnhancementType,
      provider as EnhancementProvider,
      user.id
    ).catch((error) => {
      console.error("Background enhancement error:", error);
    });

    return json({
      enhancementId: enhancement.id,
      status: "processing",
      message: "Enhancement queued. Check back in a few moments for results.",
    });
  } catch (error) {
    console.error("Enhancement error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Enhancement failed" },
      { status: 400 }
    );
  }
}
