import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const uploadMediaFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      fileName: z.string().min(1),
      fileType: z.enum(["photo", "video"]),
      mimeType: z.string(),
      fileSize: z.number().positive().max(943718400), // 900MB (2 hours max per account)
      proposalId: z.string().uuid().optional(),
      contractorId: z.string().uuid().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      locationName: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      isDamagePhoto: z.boolean().optional(),
      damageType: z.string().optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Generate storage path
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const storagePath = `${userId}/${data.fileType}s/${timestamp}-${randomId}-${data.fileName}`;

    // Create signed URL for client-side upload
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("media")
      .createSignedUploadUrl(storagePath);

    if (signedUrlError) throw new Error(signedUrlError.message);

    // Store metadata in database
    const { data: mediaRecord, error: dbError } = await supabase
      .from("photos_videos")
      .insert({
        user_id: userId,
        file_name: data.fileName,
        file_type: data.fileType,
        mime_type: data.mimeType,
        file_size: data.fileSize,
        storage_path: storagePath,
        storage_url: `${process.env.SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`,
        proposal_id: data.proposalId || null,
        contractor_id: data.contractorId || null,
        title: data.title || null,
        description: data.description || null,
        tags: data.tags || [],
        location_name: data.locationName || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        is_damage_photo: data.isDamagePhoto || false,
        damage_type: data.damageType || null,
      })
      .select()
      .single();

    if (dbError) throw new Error(dbError.message);

    return {
      mediaId: mediaRecord.id,
      uploadUrl: signedUrlData.signedUrl,
      storageUrl: mediaRecord.storage_url,
    };
  });

export const listMediaByProposal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      proposalId: z.string().uuid(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    const { data: media, error } = await supabase
      .from("photos_videos")
      .select("*")
      .eq("proposal_id", data.proposalId)
      .order("display_order", { ascending: true });

    if (error) throw new Error(error.message);
    return media || [];
  });

export const listMediaByContractor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      contractorId: z.string().uuid(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    const { data: media, error } = await supabase
      .from("photos_videos")
      .select("*")
      .eq("contractor_id", data.contractorId)
      .order("display_order", { ascending: true });

    if (error) throw new Error(error.message);
    return media || [];
  });

export const listUserMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: media, error } = await supabase
      .from("photos_videos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return media || [];
  });

export const updateMediaMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      mediaId: z.string().uuid(),
      title: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      displayOrder: z.number().optional(),
      isDamagePhoto: z.boolean().optional(),
      damageType: z.string().optional(),
      isPublic: z.boolean().optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Verify ownership
    const { data: media, error: fetchError } = await supabase
      .from("photos_videos")
      .select("user_id")
      .eq("id", data.mediaId)
      .single();

    if (fetchError || media?.user_id !== userId) {
      throw new Error("Unauthorized");
    }

    const { error: updateError } = await supabase
      .from("photos_videos")
      .update({
        title: data.title,
        description: data.description,
        tags: data.tags,
        display_order: data.displayOrder,
        is_damage_photo: data.isDamagePhoto,
        damage_type: data.damageType,
        is_public: data.isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.mediaId);

    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });

export const deleteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      mediaId: z.string().uuid(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Verify ownership and get storage path
    const { data: media, error: fetchError } = await supabase
      .from("photos_videos")
      .select("user_id, storage_path")
      .eq("id", data.mediaId)
      .single();

    if (fetchError || media?.user_id !== userId) {
      throw new Error("Unauthorized");
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("media")
      .remove([media.storage_path]);

    if (storageError) throw new Error(storageError.message);

    // Delete from database
    const { error: dbError } = await supabase
      .from("photos_videos")
      .delete()
      .eq("id", data.mediaId);

    if (dbError) throw new Error(dbError.message);
    return { ok: true };
  });

export const reorderMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      mediaIds: z.array(z.string().uuid()),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Update display order for all media
    const updates = data.mediaIds.map((id, index) => ({
      id,
      display_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from("photos_videos")
        .update({ display_order: update.display_order })
        .eq("id", update.id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const createMediaGallery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      galleryType: z.enum(["before_after", "project", "portfolio", "damage_assessment"]),
      proposalId: z.string().uuid().optional(),
      contractorId: z.string().uuid().optional(),
      mediaIds: z.array(z.string().uuid()).optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Create gallery
    const { data: gallery, error: galleryError } = await supabase
      .from("media_galleries")
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description || null,
        gallery_type: data.galleryType,
        proposal_id: data.proposalId || null,
        contractor_id: data.contractorId || null,
      })
      .select()
      .single();

    if (galleryError) throw new Error(galleryError.message);

    // Add media to gallery
    if (data.mediaIds && data.mediaIds.length > 0) {
      const galleryMedia = data.mediaIds.map((mediaId, index) => ({
        gallery_id: gallery.id,
        media_id: mediaId,
        display_order: index,
      }));

      const { error: mediaError } = await supabase
        .from("gallery_media")
        .insert(galleryMedia);

      if (mediaError) throw new Error(mediaError.message);
    }

    return gallery;
  });

export const listGalleries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: galleries, error } = await supabase
      .from("media_galleries")
      .select(`
        *,
        gallery_media(
          media_id,
          photos_videos(*)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return galleries || [];
  });
