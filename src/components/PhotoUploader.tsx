import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, ImagePlus, PlayCircle } from "lucide-react";
import { toast } from "sonner";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  prefix?: string;
  max?: number;
};

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const VIDEO_MAX_BYTES = 75 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)(\?|#|$)/i.test(url);
}

function describeLimit(type: string) {
  return VIDEO_MIME_TYPES.has(type) ? "75 MB" : "8 MB";
}

function validateFile(file: File): string | null {
  const isImage = IMAGE_MIME_TYPES.has(file.type);
  const isVideo = VIDEO_MIME_TYPES.has(file.type);

  if (!isImage && !isVideo) {
    return `${file.name} must be a JPG, PNG, WebP, HEIC, MP4, MOV, or WebM file`;
  }

  const maxBytes = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file.size > maxBytes) {
    return `${file.name} exceeds ${describeLimit(file.type)}`;
  }

  return null;
}

export function PhotoUploader({ value, onChange, prefix = "intake", max = 8 }: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (value.length + files.length > max) {
      toast.error(`Max ${max} media files`);
      return;
    }

    setUploading(true);
    const next: string[] = [];

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const folder = user?.id || "anon";

      for (const file of Array.from(files)) {
        const validationError = validateFile(file);
        if (validationError) {
          toast.error(validationError);
          continue;
        }

        const ext = EXT_BY_MIME[file.type] || (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `${folder}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("job-photos").upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type,
        });

        if (error) {
          toast.error(error.message);
          continue;
        }

        const { data: pub } = supabase.storage.from("job-photos").getPublicUrl(path);
        next.push(pub.publicUrl);
      }

      if (next.length > 0) onChange([...value, ...next]);
    } finally {
      setUploading(false);
    }
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {value.map((url) => {
          const video = isVideoUrl(url);
          return (
            <div key={url} className="relative aspect-square rounded-md overflow-hidden border border-border group bg-muted">
              {video ? (
                <video src={url} className="w-full h-full object-cover" muted preload="metadata" controls />
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" />
              )}
              {video && (
                <div className="pointer-events-none absolute left-1 bottom-1 rounded-full bg-black/70 text-white p-1">
                  <PlayCircle className="h-3 w-3" />
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                aria-label="Remove media"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        {value.length < max && (
          <label className="aspect-square flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-primary transition text-muted-foreground text-xs">
            <ImagePlus className="h-5 w-5" />
            <span>{uploading ? "Uploading…" : "Add"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Up to {max} job-site photos or videos. Images: JPG, PNG, WebP, or HEIC up to 8 MB. Videos: MP4, MOV, or WebM up to 75 MB.
      </p>
    </div>
  );
}
