import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllContractorsWithCompliance,
  adminVerifyDocument,
  requestDocumentRenewal,
  checkExpiringDocuments,
} from "@/lib/document-verification.server";
import { DOC_TYPE_LABELS, REQUIRED_DOC_TYPES, type DocType } from "@/lib/document-ai.server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck, ShieldAlert, ShieldX, Clock, Eye, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  FileText, Search,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contractor-verification")({
  head: () => ({ meta: [{ title: "Contractor Verification — Jobbidder" }] }),
  component: VerificationPage,
});

type DocRow = {
  id: string;
  document_type: string;
  status: string;
  expiration_date: string | null;
  holder_name: string | null;
  license_number: string | null;
  issuer_name: string | null;
  coverage_amount: number | null;
  ai_confidence: number | null;
  file_url: string;
  file_name: string;
  notes: string | null;
  verified_at: string | null;
  extracted_data: Record<string, any>;
};

type ContractorRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  trade_type: string | null;
  service_area: string | null;
  status: string;
  created_at: string;
  qualification_status: string | null;
  qualification_score: number | null;
  contractor_documents: DocRow[];
};

function statusBadge(status: string) {
  const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    verified:      { color: "bg-green-500/20 text-green-400 border-green-500/30",   icon: <CheckCircle2 className="w-3 h-3" />, label: "Verified" },
    ai_extracted:  { color: "bg-blue-500/20 text-blue-400 border-blue-500/30",     icon: <ShieldCheck className="w-3 h-3" />,  label: "AI Verified" },
    pending:       { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-3 h-3" />,       label: "Pending" },
    needs_review:  { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: <AlertTriangle className="w-3 h-3" />,label: "Needs Review" },
    expired:       { color: "bg-red-500/20 text-red-400 border-red-500/30",         icon: <XCircle className="w-3 h-3" />,     label: "Expired" },
    invalid:       { color: "bg-red-600/20 text-red-300 border-red-600/30",         icon: <ShieldX className="w-3 h-3" />,     label: "Invalid" },
  };
  const { color, icon, label } = map[status] ?? { color: "bg-slate-500/20 text-slate-400 border-slate-500/30", icon: null, label: status };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${color}`}>
      {icon}{label}
    </span>
  );
}

function complianceColor(docs: DocRow[]): string {
  if (docs.length === 0) return "text-slate-500";
  const hasRequired = REQUIRED_DOC_TYPES.every((t) => docs.some((d) => d.document_type === t));
  if (!hasRequired) return "text-yellow-400";
  const bad = docs.filter((d) => d.status === "expired" || d.status === "invalid");
  if (bad.length > 0) return "text-red-400";
  const allOk = docs.filter((d) => d.status === "verified" || d.status === "ai_extracted");
  if (allOk.length === docs.length && hasRequired) return "text-green-400";
  return "text-yellow-400";
}

function ComplianceIcon({ docs }: { docs: DocRow[] }) {
  const color = complianceColor(docs);
  if (color === "text-green-400") return <ShieldCheck className={`w-5 h-5 ${color}`} />;
  if (color === "text-red-400") return <ShieldX className={`w-5 h-5 ${color}`} />;
  return <ShieldAlert className={`w-5 h-5 ${color}`} />;
}

function DocCard({
  doc,
  contractorId,
  onVerify,
  onRenew,
}: {
  doc: DocRow;
  contractorId: string;
  onVerify: (docId: string, verdict: "verified" | "invalid") => void;
  onRenew: (docId: string, contractorId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const expiring = doc.expiration_date
    ? new Date(doc.expiration_date) < new Date(Date.now() + 30 * 86_400_000)
    : false;

  return (
    <div className="bg-slate-700/50 rounded-lg border border-slate-600 overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-700 transition"
        onClick={() => setExpanded((e) => !e)}
      >
        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">
              {DOC_TYPE_LABELS[doc.document_type as DocType] ?? doc.document_type}
            </span>
            {statusBadge(doc.status)}
            {expiring && (
              <span className="text-xs text-orange-400 font-medium">⚠ Expiring soon</span>
            )}
            {doc.ai_confidence != null && (
              <span className="text-xs text-slate-500">AI {doc.ai_confidence}%</span>
            )}
          </div>
          {doc.expiration_date && (
            <p className="text-xs text-slate-400 mt-0.5">
              Exp: {new Date(doc.expiration_date).toLocaleDateString()}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-600 pt-3 space-y-3">
          {/* AI-extracted fields */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Holder / Insured", doc.holder_name],
              ["License / Policy #", doc.license_number ?? doc.extracted_data?.policy_number ?? doc.extracted_data?.bond_number],
              ["Issuer", doc.issuer_name],
              ["Coverage", doc.coverage_amount ? `$${doc.coverage_amount.toLocaleString()}` : null],
              ["Expires", doc.expiration_date],
              ["File", doc.file_name],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={String(label)}>
                <p className="text-slate-500">{label}</p>
                <p className="text-slate-200 truncate">{String(value)}</p>
              </div>
            ))}
          </div>

          {doc.notes && (
            <p className="text-xs text-orange-300 italic">{doc.notes}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
            >
              <Eye className="w-3 h-3" /> View file
            </a>
            {doc.status !== "verified" && (
              <Button
                size="sm"
                className="h-6 text-xs bg-green-700 hover:bg-green-600"
                onClick={() => onVerify(doc.id, "verified")}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
              </Button>
            )}
            {doc.status !== "invalid" && (
              <Button
                size="sm"
                variant="destructive"
                className="h-6 text-xs"
                onClick={() => onVerify(doc.id, "invalid")}
              >
                <XCircle className="w-3 h-3 mr-1" /> Reject
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs border-slate-600 text-slate-300 hover:bg-slate-600"
              onClick={() => onRenew(doc.id, contractorId)}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Request renewal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractorVerificationRow({ c, onVerify, onRenew }: {
  c: ContractorRow;
  onVerify: (docId: string, verdict: "verified" | "invalid") => void;
  onRenew: (docId: string, contractorId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const docs = c.contractor_documents ?? [];

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-750 transition"
        onClick={() => setOpen((o) => !o)}
      >
        <ComplianceIcon docs={docs} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">{c.name}</span>
            {c.qualification_status && (
              <Badge
                className={
                  c.qualification_status === "APPROVED"
                    ? "bg-green-700 text-green-100"
                    : c.qualification_status === "REJECTED"
                    ? "bg-red-700 text-red-100"
                    : "bg-yellow-700 text-yellow-100"
                }
              >
                Survey: {c.qualification_status}
              </Badge>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
            <span>{c.phone}</span>
            {c.trade_type && <span>{c.trade_type}</span>}
            {c.service_area && <span>{c.service_area}</span>}
            <span>{docs.length} doc{docs.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        {/* Quick compliance badges */}
        <div className="hidden sm:flex items-center gap-1 mr-2">
          {REQUIRED_DOC_TYPES.map((t) => {
            const d = docs.find((x) => x.document_type === t);
            return (
              <span
                key={t}
                title={DOC_TYPE_LABELS[t]}
                className={`w-2 h-2 rounded-full ${
                  !d ? "bg-slate-600"
                  : d.status === "verified" || d.status === "ai_extracted" ? "bg-green-500"
                  : d.status === "expired" || d.status === "invalid" ? "bg-red-500"
                  : "bg-yellow-500"
                }`}
              />
            );
          })}
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </div>

      {open && (
        <div className="border-t border-slate-700 p-4 space-y-3">
          {/* Required doc status summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {REQUIRED_DOC_TYPES.map((t) => {
              const d = docs.find((x) => x.document_type === t);
              return (
                <div key={t} className="text-center">
                  <p className="text-xs text-slate-500 mb-1">{DOC_TYPE_LABELS[t]}</p>
                  {d ? statusBadge(d.status) : (
                    <span className="text-xs text-slate-600 italic">Missing</span>
                  )}
                </div>
              );
            })}
          </div>

          {docs.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-4">No documents uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  contractorId={c.id}
                  onVerify={onVerify}
                  onRenew={onRenew}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VerificationPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "needs_action" | "compliant" | "incomplete">("all");
  const qc = useQueryClient();

  const fetchAll = useServerFn(getAllContractorsWithCompliance);
  const doVerify = useServerFn(adminVerifyDocument);
  const doRenew = useServerFn(requestDocumentRenewal);
  const fetchExpiring = useServerFn(checkExpiringDocuments);

  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ["contractor-verification"],
    queryFn: () => fetchAll({}),
  });

  const { data: expiringData } = useQuery({
    queryKey: ["expiring-documents"],
    queryFn: () => fetchExpiring({ days_until_expiration: 60 }),
  });

  const verifyMut = useMutation({
    mutationFn: ({ docId, verdict }: { docId: string; verdict: "verified" | "invalid" }) =>
      doVerify({ document_id: docId, verdict }),
    onSuccess: () => {
      toast.success("Document updated");
      qc.invalidateQueries({ queryKey: ["contractor-verification"] });
    },
    onError: () => toast.error("Failed to update document"),
  });

  const renewMut = useMutation({
    mutationFn: ({ docId, contractorId }: { docId: string; contractorId: string }) =>
      doRenew({ document_id: docId, contractor_id: contractorId }),
    onSuccess: (data) => {
      toast.success(data.sms_sent ? "Renewal SMS sent" : "Renewal request logged");
    },
    onError: () => toast.error("Failed to send renewal request"),
  });

  const filtered = (contractors as ContractorRow[]).filter((c) => {
    const q = search.toLowerCase();
    if (q && !c.name?.toLowerCase().includes(q) && !c.phone?.includes(q) && !c.trade_type?.toLowerCase().includes(q)) return false;
    const docs = c.contractor_documents ?? [];
    if (filter === "compliant") {
      const hasRequired = REQUIRED_DOC_TYPES.every((t) => docs.some((d) => d.document_type === t && (d.status === "verified" || d.status === "ai_extracted")));
      return hasRequired;
    }
    if (filter === "incomplete") return docs.length === 0;
    if (filter === "needs_action") {
      return docs.some((d) => d.status === "needs_review" || d.status === "expired" || d.status === "invalid" || d.status === "pending");
    }
    return true;
  });

  const stats = {
    total: (contractors as ContractorRow[]).length,
    compliant: (contractors as ContractorRow[]).filter((c) => {
      const docs = c.contractor_documents ?? [];
      return REQUIRED_DOC_TYPES.every((t) => docs.some((d) => d.document_type === t && (d.status === "verified" || d.status === "ai_extracted")));
    }).length,
    needsAction: (contractors as ContractorRow[]).filter((c) =>
      (c.contractor_documents ?? []).some((d) => ["needs_review","expired","invalid","pending"].includes(d.status))
    ).length,
    noDocuments: (contractors as ContractorRow[]).filter((c) => (c.contractor_documents ?? []).length === 0).length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Contractor Verification</h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI-extracted credentials — review, approve, or request renewals before NGS engages contractors
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Contractors", value: stats.total, icon: <ShieldCheck className="w-5 h-5 text-blue-400" /> },
          { label: "Fully Compliant", value: stats.compliant, icon: <ShieldCheck className="w-5 h-5 text-green-400" /> },
          { label: "Needs Action", value: stats.needsAction, icon: <ShieldAlert className="w-5 h-5 text-orange-400" /> },
          { label: "Expiring (60d)", value: expiringData?.total ?? 0, icon: <Clock className="w-5 h-5 text-yellow-400" /> },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-xs text-muted-foreground">{s.label}</span></div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="contractors">
        <TabsList className="mb-4">
          <TabsTrigger value="contractors">All Contractors</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
        </TabsList>

        <TabsContent value="contractors" className="space-y-4">
          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or trade…"
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="py-2 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All</option>
              <option value="needs_action">Needs Action</option>
              <option value="compliant">Fully Compliant</option>
              <option value="incomplete">No Documents</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading contractors…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No contractors match</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => (
                <ContractorVerificationRow
                  key={c.id}
                  c={c}
                  onVerify={(docId, verdict) => verifyMut.mutate({ docId, verdict })}
                  onRenew={(docId, contractorId) => renewMut.mutate({ docId, contractorId })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expiring" className="space-y-3">
          {(expiringData?.expiring_documents ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No documents expiring within 60 days</div>
          ) : (
            (expiringData?.expiring_documents ?? []).map((doc: any) => (
              <div key={doc.id} className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {doc.contractor_applications?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {DOC_TYPE_LABELS[doc.document_type as DocType] ?? doc.document_type}
                      {" — "}
                      Expires {new Date(doc.expiration_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {statusBadge(doc.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => renewMut.mutate({ docId: doc.id, contractorId: doc.contractor_id })}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Request renewal
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
