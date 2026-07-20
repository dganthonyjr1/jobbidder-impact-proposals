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
import { uploadContractorDocument, getContractorDocuments, checkExpiringDocuments } from "@/lib/document-verification.server";
import { useQuery } from "@tanstack/react-query";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Calendar, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "License & Insurance Documents — Jobbidder" }] }),
  component: DocumentsPage,
});

const DOCUMENT_TYPES = [
  { value: "license", label: "Contractor License", icon: "📋" },
  { value: "liability_insurance", label: "Liability Insurance", icon: "🛡️" },
  { value: "workers_comp", label: "Workers' Compensation", icon: "👷" },
  { value: "surety_bond", label: "Surety Bond", icon: "📜" },
];

function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<"upload" | "manage">("upload");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("license");
  const [expirationDate, setExpirationDate] = useState("");
  const [notes, setNotes] = useState("");

  const doUpload = useServerFn(uploadContractorDocument);
  const fetchDocuments = useServerFn(getContractorDocuments);
  const fetchExpiringDocs = useServerFn(checkExpiringDocuments);

  const { data: documents, refetch: refetchDocuments } = useQuery({
    queryKey: ["contractor-documents"],
    queryFn: () => fetchDocuments({ data: { contractorId: "" } }), // Will be populated with actual contractor ID
  });

  const { data: expiringDocs } = useQuery({
    queryKey: ["expiring-documents"],
    queryFn: () => fetchExpiringDocs({ data: { contractorId: "", days_until_expiration: 30 } }),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (PDF, images)
      const validTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a PDF or image file");
        return;
      }

      // Validate file size (50MB max for documents)
      if (file.size > 52428800) {
        toast.error("File size exceeds 50MB limit");
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

    if (!documentType) {
      toast.error("Please select a document type");
      return;
    }

    setUploading(true);
    try {
      // In production, this would upload to Supabase Storage
      // For now, we'll simulate the upload
      const result = await doUpload({ data: {
        contractor_id: "", // Will be populated with actual contractor ID
        document_type: documentType as "license" | "liability_insurance" | "workers_comp" | "surety_bond",
        file_url: "", // Will be populated with actual Supabase URL
        file_name: selectedFile.name,
      } });

      toast.success("Document uploaded successfully! We'll verify it within 24 hours.");
      // Reset form
      setSelectedFile(null);
      setDocumentType("license");
      setExpirationDate("");
      setNotes("");
      // Refetch documents
      refetchDocuments();
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  const getDocumentIcon = (type: string) => {
    const doc = DOCUMENT_TYPES.find((d) => d.value === type);
    return doc?.icon || "📄";
  };

  const getDocumentLabel = (type: string) => {
    const doc = DOCUMENT_TYPES.find((d) => d.value === type);
    return doc?.label || type;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">License & Insurance Documents</h1>
          <p className="text-muted-foreground">
            Upload and manage your contractor credentials, licenses, and insurance documents
          </p>
        </div>

        {/* Expiring Documents Alert */}
        {expiringDocs && expiringDocs.expiring_documents && expiringDocs.expiring_documents.length > 0 && (
          <Card className="mb-6 bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-200 mb-1">Documents Expiring Soon</h3>
                  <p className="text-yellow-100/80 text-sm">
                    You have {expiringDocs.expiring_documents.length} document(s) expiring within the next 30 days. Please renew them to maintain your contractor status.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "manage")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="data-[state=active]:bg-primary">
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-primary">
              <FileText className="w-4 h-4 mr-2" />
              Manage Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6 mt-6">
            <Card >
              <CardHeader>
                <CardTitle className="text-foreground">Upload New Document</CardTitle>
                <CardDescription>
                  Upload your contractor license, insurance, or bond documentation. All documents are verified within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DOCUMENT_TYPES.map((doc) => (
                    <button
                      key={doc.value}
                      onClick={() => setDocumentType(doc.value)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        documentType === doc.value
                          ? "bg-primary/20 border-primary"
                          : "bg-muted border-border hover:border-ring"
                      }`}
                    >
                      <div className="text-2xl mb-2">{doc.icon}</div>
                      <p className="font-semibold text-foreground">{doc.label}</p>
                    </button>
                  ))}
                </div>

                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="doc-input"
                    onChange={handleFileSelect}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                  />
                  <label
                    htmlFor="doc-input"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    {selectedFile ? (
                      <>
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                        <div>
                          <p className="text-foreground font-semibold">{selectedFile.name}</p>
                          <p className="text-muted-foreground text-sm">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-muted-foreground" />
                        <div>
                          <p className="text-foreground font-semibold">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-muted-foreground text-sm">
                            PDF or image files up to 50MB
                          </p>
                        </div>
                      </>
                    )}
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="expiration" className="text-foreground">
                      Expiration Date (Optional)
                    </Label>
                    <Input
                      id="expiration"
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-foreground">
                      Additional Notes (Optional)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="e.g., License number, policy details, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6 mt-6">
            <Card >
              <CardHeader>
                <CardTitle className="text-foreground">Your Documents</CardTitle>
                <CardDescription>
                  View and manage all your uploaded documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents && documents.documents && documents.documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="bg-muted rounded-lg p-4 border border-border flex items-start justify-between"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-2xl mt-1">{getDocumentIcon(doc.document_type)}</div>
                          <div className="flex-1">
                            <h3 className="text-foreground font-semibold">
                              {getDocumentLabel(doc.document_type)}
                            </h3>
                            <p className="text-muted-foreground text-sm">{doc.file_name}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
                                doc.status === "verified"
                                  ? "bg-green-500/20 text-green-300"
                                  : doc.status === "pending"
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : "bg-red-500/20 text-red-300"
                              }`}>
                                <CheckCircle2 className="w-3 h-3" />
                                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                              </span>
                              {doc.expiration_date && (
                                <span className="text-muted-foreground text-xs flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Expires: {new Date(doc.expiration_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No documents uploaded yet</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Upload your documents to get verified and start receiving jobs
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Compliance Status */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOCUMENT_TYPES.map((doc) => {
                const uploaded = documents?.documents?.find((d: any) => d.document_type === doc.value);
                return (
                  <div key={doc.value} className="bg-muted rounded-lg p-4 border border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-semibold">{doc.label}</p>
                        <p className="text-muted-foreground text-sm">
                          {uploaded ? (
                            <span className="text-green-400">✓ Uploaded</span>
                          ) : (
                            <span className="text-yellow-400">⚠ Missing</span>
                          )}
                        </p>
                      </div>
                      <div className="text-2xl">{doc.icon}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
