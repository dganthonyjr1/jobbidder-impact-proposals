import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Video as VideoIcon, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface MediaUploadProps {
  onUploadComplete?: (mediaId: string, url: string) => void;
  proposalId?: string;
  contractorId?: string;
  acceptedFileTypes?: "photo" | "video" | "both";
  maxFileSize?: number; // in bytes
}

export function MediaUpload({
  onUploadComplete,
  proposalId,
  contractorId,
  acceptedFileTypes = "both",
  maxFileSize = 943718400, // 900MB (2 hours)
}: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptedTypes = () => {
    if (acceptedFileTypes === "photo") return "image/*";
    if (acceptedFileTypes === "video") return "video/*";
    return "image/*,video/*";
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxFileSize) {
      return { valid: false, error: `File size exceeds ${maxFileSize / 1024 / 1024}MB limit` };
    }

    // Check file type
    if (acceptedFileTypes === "photo" && !file.type.startsWith("image/")) {
      return { valid: false, error: "Only image files are allowed" };
    }
    if (acceptedFileTypes === "video" && !file.type.startsWith("video/")) {
      return { valid: false, error: "Only video files are allowed" };
    }

    // Check specific formats
    const allowedFormats = {
      photo: ["image/jpeg", "image/png", "image/webp", "image/heic"],
      video: ["video/mp4", "video/webm", "video/quicktime"],
    };

    if (acceptedFileTypes !== "both") {
      const formats = allowedFormats[acceptedFileTypes];
      if (!formats.includes(file.type)) {
        return { valid: false, error: `File format not supported. Allowed: ${formats.join(", ")}` };
      }
    }

    return { valid: true };
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateFile(file);

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Determine file type
      const fileType = file.type.startsWith("image/") ? "photo" : "video";

      // Get upload URL from server
      const response = await fetch("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType,
          mimeType: file.type,
          fileSize: file.size,
          proposalId,
          contractorId,
        }),
      });

      if (!response.ok) throw new Error("Failed to get upload URL");

      const { uploadUrl, storageUrl, mediaId } = await response.json();

      // Upload file to storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload file");

      setUploadProgress(100);
      toast.success(`${fileType === "photo" ? "Photo" : "Video"} uploaded successfully`);

      if (onUploadComplete) {
        onUploadComplete(mediaId, storageUrl);
      }

      // Reset
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-lg border-2 border-dashed transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/30 hover:border-primary/50"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedTypes()}
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={isUploading}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center p-8 text-center">
        {isUploading ? (
          <>
            <Loader className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm font-medium">Uploading...</p>
            <div className="w-full max-w-xs mt-2 bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-4 mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <VideoIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">
              {acceptedFileTypes === "photo"
                ? "Upload Photos"
                : acceptedFileTypes === "video"
                  ? "Upload Videos"
                  : "Upload Photos or Videos"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop or click to select files
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              Select File
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Max file size: {maxFileSize / 1024 / 1024}MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}
