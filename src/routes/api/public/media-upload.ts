import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const UploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.enum(["photo", "video"]),
  mimeType: z.string(),
  fileSize: z.number().positive().max(104857600), // 100MB
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
});

export const Route = createFileRoute("/api/public/media-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Get user ID from auth header
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const token = authHeader.slice(7);
          const {
            data: { user },
            error: authError,
          } = await supabaseAdmin.auth.getUser(token);

          if (authError || !user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const body = await request.json();
          const data = UploadSchema.parse(body);

          // Generate storage path
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(7);
          const storagePath = `${user.id}/${data.fileType}s/${timestamp}-${randomId}-${data.fileName}`;

          // Create signed upload URL
          const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from("media")
            .createSignedUploadUrl(storagePath);

          if (signedUrlError) {
            throw new Error(signedUrlError.message);
          }

          // Store metadata in database
          const { data: mediaRecord, error: dbError } = await supabaseAdmin
            .from("photos_videos")
            .insert({
              user_id: user.id,
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

          if (dbError) {
            throw new Error(dbError.message);
          }

          return Response.json({
            mediaId: mediaRecord.id,
            uploadUrl: signedUrlData.signedUrl,
            storageUrl: mediaRecord.storage_url,
          });
        } catch (error) {
          console.error("Upload error:", error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 400 }
          );
        }
      },
    },
  },
});
