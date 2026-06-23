import { useState } from "react";
import { Trash2, Download, Eye, EyeOff, Tag, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MobileVideoPlayer } from "./mobile-video-player";
import { PhotoEnhancementPanel } from "./photo-enhancement-panel";

interface MediaItem {
  id: string;
  file_name: string;
  file_type: "photo" | "video";
  storage_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  tags?: string[];
  damage_type?: string;
  is_damage_photo?: boolean;
  is_public?: boolean;
  location_name?: string;
  created_at: string;
  mime_type: string;
}

interface MediaGalleryProps {
  media: MediaItem[];
  onDelete?: (mediaId: string) => void;
  onTogglePublic?: (mediaId: string, isPublic: boolean) => void;
  isLoading?: boolean;
  editable?: boolean;
}

export function MediaGallery({
  media,
  onDelete,
  onTogglePublic,
  isLoading = false,
  editable = false,
}: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const handleDelete = async (mediaId: string) => {
    if (window.confirm("Delete this media?")) {
      try {
        onDelete?.(mediaId);
        toast.success("Media deleted");
      } catch (error) {
        toast.error("Failed to delete media");
      }
    }
  };

  const handleTogglePublic = async (mediaId: string, isPublic: boolean) => {
    try {
      onTogglePublic?.(mediaId, !isPublic);
      toast.success(isPublic ? "Made private" : "Made public");
    } catch (error) {
      toast.error("Failed to update media");
    }
  };

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!media || media.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No media uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {media.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:border-primary transition-colors cursor-pointer"
            onClick={() => setSelectedMedia(item)}
          >
            {/* Thumbnail */}
            {item.file_type === "photo" ? (
              <img
                src={item.storage_url}
                alt={item.title || item.file_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <video
                src={item.storage_url}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {item.file_type === "video" && (
                <div className="text-white text-3xl">▶</div>
              )}
            </div>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                {item.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Damage indicator */}
            {item.is_damage_photo && (
              <Badge className="absolute top-2 right-2 bg-red-500">
                Damage
              </Badge>
            )}

            {/* Public indicator */}
            {item.is_public && (
              <Badge className="absolute bottom-2 left-2 bg-blue-500">
                Public
              </Badge>
            )}

            {/* Actions */}
            {editable && (
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePublic(item.id, item.is_public || false);
                  }}
                  title={item.is_public ? "Make private" : "Make public"}
                >
                  {item.is_public ? (
                    <Eye className="h-4 w-4 text-white" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-white" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(item.storage_url, item.file_name);
                  }}
                  title="Download"
                >
                  <Download className="h-4 w-4 text-white" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 bg-black/50 hover:bg-red-600/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Media */}
            {selectedMedia.file_type === "photo" ? (
              <img
                src={selectedMedia.storage_url}
                alt={selectedMedia.title || selectedMedia.file_name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            ) : (
              <MobileVideoPlayer
                src={selectedMedia.storage_url}
                title={selectedMedia.title || selectedMedia.file_name}
                controls={true}
                onDownload={() => handleDownload(selectedMedia.storage_url, selectedMedia.file_name)}
              />
            )}

            {/* Info */}
            <div className="mt-4 text-white">
              <h3 className="text-lg font-semibold">
                {selectedMedia.title || selectedMedia.file_name}
              </h3>
              {selectedMedia.description && (
                <p className="text-sm text-gray-300 mt-2">{selectedMedia.description}</p>
              )}

              <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-400">
                {selectedMedia.location_name && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedMedia.location_name}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(selectedMedia.created_at).toLocaleDateString()}
                </div>
                {selectedMedia.damage_type && (
                  <Badge className="bg-red-500">{selectedMedia.damage_type}</Badge>
                )}
              </div>

              {selectedMedia.tags && selectedMedia.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedMedia.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* AI Enhancement Panel */}
              {selectedMedia.file_type === "photo" && (
                <div className="mt-6 pt-6 border-t border-white/20">
                  <PhotoEnhancementPanel
                    mediaId={selectedMedia.id}
                    imageUrl={selectedMedia.storage_url}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
