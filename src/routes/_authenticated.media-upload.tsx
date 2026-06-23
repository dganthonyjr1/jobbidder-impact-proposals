import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadMediaFile, listMediaByContractor } from "@/lib/media.functions";
import { useQuery } from "@tanstack/react-query";
import { Upload, Image as ImageIcon, Video, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/media-upload")({
  head: () => ({ meta: [{ title: "Upload Photos & Videos — Jobbidder" }] }),
  component: MediaUploadPage,
});

function MediaUploadPage() {
  const [activeTab, setActiveTab] = useState<"photos" | "videos">("photos");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [damageType, setDamageType] = useState<string>("");
  const [isDamagePhoto, setIsDamagePhoto] = useState(false);
  const [tags, setTags] = useState("");
  const [locationName, setLocationName] = useState("");

  const doUpload = useServerFn(uploadMediaFile);
  const fetchMedia = useServerFn(listMediaByContractor);
  const { data: media, refetch: refetchMedia } = useQuery({
    queryKey: ["contractor-media"],
    queryFn: () => fetchMedia({ contractorId: "" }), // Will be populated with actual contractor ID
  });

  const damageTypes = [
    "roof",
    "window",
    "siding",
    "foundation",
    "door",
    "gutter",
    "soffit",
    "fascia",
    "deck",
    "fence",
    "other",
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (900MB max)
      if (file.size > 943718400) {
        toast.error("File size exceeds 900MB limit");
        return;
      }

      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/webm",
        "video/quicktime",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload an image or video.");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    try {
      // Upload file to Supabase
      const result = await doUpload({
        fileName: selectedFile.name,
        fileType: activeTab === "photos" ? "photo" : "video",
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
        title: title || selectedFile.name,
        description,
        tags: tags ? tags.split(",").map((t) => t.trim()) : [],
        isDamagePhoto,
        damageType: isDamagePhoto ? damageType : null,
        locationName,
      });

      toast.success("File uploaded successfully!");
      
      // Reset form
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      setDamageType("");
      setIsDamagePhoto(false);
      setTags("");
      setLocationName("");
      
      // Refetch media list
      refetchMedia();
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Media Upload Center</h1>
          <p className="text-slate-400">
            Upload project photos and videos to showcase your work and build your portfolio
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "photos" | "videos")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 border border-slate-700">
            <TabsTrigger value="photos" className="data-[state=active]:bg-blue-600">
              <ImageIcon className="w-4 h-4 mr-2" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="videos" className="data-[state=active]:bg-blue-600">
              <Video className="w-4 h-4 mr-2" />
              Videos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="space-y-6 mt-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Upload Project Photos</CardTitle>
                <CardDescription>
                  Upload high-quality photos of your completed projects. Max 900MB per file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <UploadZone
                  activeTab={activeTab}
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                />

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="photo-title" className="text-white">
                      Photo Title
                    </Label>
                    <Input
                      id="photo-title"
                      placeholder="e.g., Roof Replacement - Before"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <Label htmlFor="photo-description" className="text-white">
                      Description
                    </Label>
                    <Textarea
                      id="photo-description"
                      placeholder="Describe what's in the photo..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="location" className="text-white">
                      Location/Address
                    </Label>
                    <Input
                      id="location"
                      placeholder="Project location"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        id="is-damage"
                        type="checkbox"
                        checked={isDamagePhoto}
                        onChange={(e) => setIsDamagePhoto(e.target.checked)}
                        className="rounded border-slate-600"
                      />
                      <Label htmlFor="is-damage" className="text-white cursor-pointer">
                        This is a damage assessment photo
                      </Label>
                    </div>

                    {isDamagePhoto && (
                      <Select value={damageType} onValueChange={setDamageType}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Select damage type" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          {damageTypes.map((type) => (
                            <SelectItem key={type} value={type} className="text-white">
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="tags" className="text-white">
                      Tags (comma-separated)
                    </Label>
                    <Input
                      id="tags"
                      placeholder="e.g., before, after, roof, residential"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="videos" className="space-y-6 mt-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Upload Project Videos</CardTitle>
                <CardDescription>
                  Upload videos of your projects in progress or completed work. Max 900MB per file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <UploadZone
                  activeTab={activeTab}
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                />

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="video-title" className="text-white">
                      Video Title
                    </Label>
                    <Input
                      id="video-title"
                      placeholder="e.g., Roof Replacement - Time Lapse"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <Label htmlFor="video-description" className="text-white">
                      Description
                    </Label>
                    <Textarea
                      id="video-description"
                      placeholder="Describe what's in the video..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="video-location" className="text-white">
                      Location/Address
                    </Label>
                    <Input
                      id="video-location"
                      placeholder="Project location"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <Label htmlFor="video-tags" className="text-white">
                      Tags (comma-separated)
                    </Label>
                    <Input
                      id="video-tags"
                      placeholder="e.g., timelapse, residential, roofing"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Video
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Media Gallery */}
        <Card className="mt-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Your Media Library</CardTitle>
            <CardDescription>
              All your uploaded photos and videos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {media && media.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {media.map((item: any) => (
                  <div key={item.id} className="bg-slate-700 rounded-lg overflow-hidden border border-slate-600">
                    <div className="aspect-video bg-slate-600 flex items-center justify-center">
                      {item.file_type === "photo" ? (
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      ) : (
                        <Video className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-white font-semibold truncate">{item.title}</h3>
                      <p className="text-slate-400 text-sm">{item.file_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No media uploaded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UploadZone({
  activeTab,
  selectedFile,
  onFileSelect,
}: {
  activeTab: "photos" | "videos";
  selectedFile: File | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
      <input
        type="file"
        id="file-input"
        onChange={onFileSelect}
        accept={activeTab === "photos" ? "image/*" : "video/*"}
        className="hidden"
      />
      <label
        htmlFor="file-input"
        className="cursor-pointer flex flex-col items-center gap-3"
      >
        {selectedFile ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div>
              <p className="text-white font-semibold">{selectedFile.name}</p>
              <p className="text-slate-400 text-sm">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-slate-400" />
            <div>
              <p className="text-white font-semibold">
                Click to upload or drag and drop
              </p>
              <p className="text-slate-400 text-sm">
                {activeTab === "photos"
                  ? "PNG, JPG, WebP up to 900MB"
                  : "MP4, WebM, MOV up to 900MB"}
              </p>
            </div>
          </>
        )}
      </label>
    </div>
  );
}
