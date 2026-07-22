import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ingestKnowledgeDocument,
  listKnowledgeDocuments,
  deleteKnowledgeDocument,
  askKnowledgeBase,
  indexExistingProposals,
  type KbCitation,
} from "@/lib/knowledge-base.server";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Search, Trash2, Loader2, FileText, Sparkles, AlertCircle, Upload, FolderInput } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge Base — Jobbidder" }] }),
  component: KnowledgePage,
});

// File types the knowledge base accepts (kept in sync with file-extract.server.ts).
const ACCEPT_EXTS = [".pdf", ".docx", ".xlsx", ".xls", ".csv", ".txt", ".md", ".pptx", ".eml"];

function KnowledgePage() {
  const listFn = useServerFn(listKnowledgeDocuments);
  const ingestFn = useServerFn(ingestKnowledgeDocument);
  const deleteFn = useServerFn(deleteKnowledgeDocument);
  const askFn = useServerFn(askKnowledgeBase);
  const indexProposalsFn = useServerFn(indexExistingProposals);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; citations: KbCitation[] } | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docText, setDocText] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["kb-documents"],
    queryFn: () => listFn({ data: undefined as never }),
  });

  const ask = useMutation({
    mutationFn: (q: string) => askFn({ data: { question: q, match_count: 8 } }),
    onSuccess: (res) => setAnswer(res),
    onError: (e: Error) => toast.error(e.message),
  });

  const ingest = useMutation({
    mutationFn: () => ingestFn({ data: { title: docTitle.trim(), text: docText.trim(), source_type: "note" } }),
    onSuccess: (res) => {
      toast.success(`Indexed “${docTitle}” (${res.chunks} passages)`);
      setDocTitle("");
      setDocText("");
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { document_id: id } }),
    onSuccess: () => refetch(),
    onError: (e: Error) => toast.error(e.message),
  });

  const preload = useMutation({
    mutationFn: () => indexProposalsFn({ data: { limit: 200 } }),
    onSuccess: (res) => {
      toast.success(`Indexed ${res.indexed} proposal${res.indexed === 1 ? "" : "s"}` + (res.skipped ? `, skipped ${res.skipped}` : "") + (res.failed ? `, ${res.failed} failed` : ""));
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    const ext = (file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]) ?? "";
    if (!ACCEPT_EXTS.includes(`.${ext}`)) return toast.error(`Unsupported file type. Try: ${ACCEPT_EXTS.join(", ")}`);
    if (file.size > 25 * 1024 * 1024) return toast.error("File exceeds 25 MB.");
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error("Please sign in again.");
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("knowledge-docs").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (upErr) return toast.error(upErr.message);
      const res = await ingestFn({ data: { title: file.name.replace(/\.[a-z0-9]+$/i, ""), source_type: "upload", storage_path: path, file_name: file.name, file_mime: file.type || undefined } });
      toast.success(`Indexed “${file.name}” (${res.chunks} passages)`);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const enabled = data?.enabled ?? false;
  const embeddingsReady = data?.embeddings_ready ?? false;
  const documents = data?.documents ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">
            Ask questions across your uploaded documents and get answers with citations back to the source.
          </p>
        </div>
      </div>

      {!isLoading && !enabled && (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardContent className="flex items-start gap-3 pt-6 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">The knowledge base is off for this account.</p>
              <p className="text-amber-800">
                It ships disabled by default. Turn it on by setting <code>RAG_ENABLED=true</code> or enabling{" "}
                <code>use_knowledge_base</code> in this account&apos;s pricing settings.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {enabled && !embeddingsReady && (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardContent className="flex items-start gap-3 pt-6 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">No embeddings provider configured.</p>
              <p className="text-amber-800">
                Set <code>OPENAI_API_KEY</code> (or <code>VOYAGE_API_KEY</code>) so documents can be indexed and searched.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ask */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" /> Ask your documents
          </CardTitle>
          <CardDescription>Plain-English question. The answer cites the documents it came from.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What warranty term did we quote on the Echols roof?"
              onKeyDown={(e) => e.key === "Enter" && question.trim() && ask.mutate(question.trim())}
              disabled={!enabled || !embeddingsReady}
            />
            <Button
              onClick={() => ask.mutate(question.trim())}
              disabled={!enabled || !embeddingsReady || question.trim().length < 3 || ask.isPending}
            >
              {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="ml-2">Ask</span>
            </Button>
          </div>

          {answer && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer.answer}</p>
              {answer.citations.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Sources</p>
                  {answer.citations.map((c) => (
                    <div key={c.ref} className="flex gap-2 text-xs">
                      <Badge variant="secondary" className="h-5 shrink-0">
                        {c.ref}
                      </Badge>
                      <div>
                        <span className="font-medium">{c.title}</span>
                        {c.page ? <span className="text-muted-foreground"> · p.{c.page}</span> : null}
                        {c.heading ? <span className="text-muted-foreground"> · {c.heading}</span> : null}
                        <p className="text-muted-foreground">{c.snippet}…</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add a document */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add documents</CardTitle>
          <CardDescription>Upload a file (PDF, Word, Excel/CSV, PowerPoint, text, or email), pre-load your existing proposals, or paste text directly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* PDF upload + pre-load existing proposals */}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" disabled={!enabled || !embeddingsReady || uploading}>
              <label className="cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-2">Upload a file</span>
                <input type="file" accept={ACCEPT_EXTS.join(",")} className="hidden" onChange={handleFileUpload} disabled={!enabled || !embeddingsReady || uploading} />
              </label>
            </Button>
            <Button variant="outline" onClick={() => preload.mutate()} disabled={!enabled || !embeddingsReady || preload.isPending}>
              {preload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderInput className="h-4 w-4" />}
              <span className="ml-2">Pre-load my existing proposals</span>
            </Button>
          </div>

          <div className="border-t pt-4 text-sm font-medium text-muted-foreground">Or paste text</div>

          <div className="space-y-1">
            <Label htmlFor="kb-title">Title</Label>
            <Input id="kb-title" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. Standard warranty terms" disabled={!enabled} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="kb-text">Text</Label>
            <Textarea id="kb-text" value={docText} onChange={(e) => setDocText(e.target.value)} rows={5} placeholder="Paste the document contents…" disabled={!enabled} />
          </div>
          <Button
            onClick={() => ingest.mutate()}
            disabled={!enabled || !embeddingsReady || docTitle.trim().length < 1 || docText.trim().length < 30 || ingest.isPending}
          >
            {ingest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            <span className="ml-2">Index document</span>
          </Button>
        </CardContent>
      </Card>

      {/* Indexed documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Indexed documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 && <p className="text-sm text-muted-foreground">Nothing indexed yet.</p>}
          {documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{d.title}</p>
                <p className="text-xs text-muted-foreground">
                  {d.status === "indexed" ? `${d.chunk_count} passages` : d.status}
                  {d.error ? ` · ${d.error}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={d.status === "indexed" ? "secondary" : d.status === "failed" ? "destructive" : "outline"}>
                  {d.status}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(d.id)} disabled={remove.isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
