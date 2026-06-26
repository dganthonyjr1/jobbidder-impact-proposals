import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, User, Building2, Phone, DollarSign, Calendar, ChevronRight } from "lucide-react";
import { z } from "zod";

// ─── Server functions ──────────────────────────────────────────────────────────

const getContractorPipeline = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [recruitsRes, applicationsRes, voiceRes, docsRes] = await Promise.all([
    supabaseAdmin.from("contractor_recruits").select("id,name,phone,trade_type,service_niche,service_state,status,created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("contractor_applications").select("id,name,phone,email,trade_type,service_area,status,qualification_status,created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("voice_prequal_calls").select("phone,call_disposition,created_at"),
    supabaseAdmin.from("contractor_documents").select("contractor_id,status"),
  ]);

  const recruits = recruitsRes.data ?? [];
  const applications = applicationsRes.data ?? [];
  const voiceCalls = voiceRes.data ?? [];
  const docs = docsRes.data ?? [];

  const calledPhones = new Set(voiceCalls.map((v: any) => v.phone));
  const appPhones = new Set(applications.map((a: any) => a.phone));
  const docsByContractor: Record<string, any[]> = {};
  for (const d of docs) {
    if (!docsByContractor[d.contractor_id]) docsByContractor[d.contractor_id] = [];
    docsByContractor[d.contractor_id].push(d);
  }

  const stages: Record<string, any[]> = {
    recruited: [],
    called: [],
    applied: [],
    docs_review: [],
    active: [],
  };

  for (const r of recruits) {
    if (!appPhones.has(r.phone)) {
      if (calledPhones.has(r.phone)) {
        stages.called.push({ ...r, _type: "recruit" });
      } else {
        stages.recruited.push({ ...r, _type: "recruit" });
      }
    }
  }

  for (const a of applications) {
    const contractorDocs = docsByContractor[a.id] ?? [];
    if (a.qualification_status === "compliant") {
      stages.active.push({ ...a, _type: "application", doc_count: contractorDocs.length });
    } else if (contractorDocs.length > 0) {
      stages.docs_review.push({ ...a, _type: "application", doc_count: contractorDocs.length });
    } else {
      stages.applied.push({ ...a, _type: "application", doc_count: 0 });
    }
  }

  return stages;
});

const getClientDeals = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("client_deals")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
});

const createDeal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    company_name: z.string().min(1),
    contact_name: z.string().optional(),
    contact_phone: z.string().optional(),
    contact_email: z.string().optional(),
    deal_value: z.number().optional(),
    stage: z.string().default("lead"),
    notes: z.string().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("client_deals").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const moveDeal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid(),
    stage: z.string(),
  }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("client_deals").update({ stage: data.stage, updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Constants ─────────────────────────────────────────────────────────────────

const CONTRACTOR_STAGES = [
  { key: "recruited", label: "Recruited", color: "bg-slate-100 border-slate-300", dot: "bg-slate-400" },
  { key: "called", label: "AI Called", color: "bg-blue-50 border-blue-300", dot: "bg-blue-400" },
  { key: "applied", label: "Applied", color: "bg-yellow-50 border-yellow-300", dot: "bg-yellow-400" },
  { key: "docs_review", label: "Docs Review", color: "bg-orange-50 border-orange-300", dot: "bg-orange-400" },
  { key: "active", label: "Active ✓", color: "bg-green-50 border-green-300", dot: "bg-green-500" },
];

const DEAL_STAGES = [
  { key: "lead", label: "New Lead", color: "bg-slate-100 border-slate-300", dot: "bg-slate-400" },
  { key: "meeting", label: "Meeting Set", color: "bg-blue-50 border-blue-300", dot: "bg-blue-400" },
  { key: "proposal", label: "Proposal Sent", color: "bg-purple-50 border-purple-300", dot: "bg-purple-400" },
  { key: "negotiating", label: "Negotiating", color: "bg-yellow-50 border-yellow-300", dot: "bg-yellow-400" },
  { key: "won", label: "Won 🎉", color: "bg-green-50 border-green-300", dot: "bg-green-500" },
  { key: "lost", label: "Lost", color: "bg-red-50 border-red-300", dot: "bg-red-400" },
];

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function fmt(n?: number) {
  if (!n) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// ─── Components ────────────────────────────────────────────────────────────────

function ContractorCard({ item }: { item: any }) {
  return (
    <div className="bg-white rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.name || "Unknown"}</p>
          <p className="text-xs text-muted-foreground truncate">{item.trade_type || item.service_niche || "—"}</p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{daysSince(item.created_at)}d</span>
      </div>
      {item.phone && (
        <div className="flex items-center gap-1 mt-1.5">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{item.phone}</span>
        </div>
      )}
      {item.doc_count > 0 && (
        <div className="mt-1.5 text-xs text-orange-600 font-medium">{item.doc_count} doc{item.doc_count !== 1 ? "s" : ""} uploaded</div>
      )}
      {(item.service_area || item.service_state) && (
        <div className="text-xs text-muted-foreground mt-1">{item.service_area || item.service_state}</div>
      )}
    </div>
  );
}

function DealCard({ deal, stages, onMove }: { deal: any; stages: typeof DEAL_STAGES; onMove: (id: string, stage: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{deal.company_name}</p>
          {deal.contact_name && <p className="text-xs text-muted-foreground truncate">{deal.contact_name}</p>}
        </div>
        <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground">
          <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
      </div>
      {deal.deal_value && (
        <div className="flex items-center gap-1 mt-1.5">
          <DollarSign className="h-3 w-3 text-green-600" />
          <span className="text-sm font-semibold text-green-600">{fmt(deal.deal_value)}</span>
        </div>
      )}
      {deal.contact_phone && (
        <div className="flex items-center gap-1 mt-1">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{deal.contact_phone}</span>
        </div>
      )}
      <div className="mt-1.5 text-xs text-muted-foreground">{daysSince(deal.created_at)}d ago</div>
      {open && (
        <div className="mt-2 pt-2 border-t border-border">
          {deal.notes && <p className="text-xs text-muted-foreground mb-2">{deal.notes}</p>}
          <p className="text-xs font-medium mb-1 text-muted-foreground">Move to:</p>
          <div className="flex flex-wrap gap-1">
            {stages.filter(s => s.key !== deal.stage).map(s => (
              <button key={s.key} onClick={() => onMove(deal.id, s.key)}
                className="text-xs px-2 py-0.5 rounded border border-border hover:bg-accent transition-colors">
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewDealModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({ company_name: "", contact_name: "", contact_phone: "", contact_email: "", deal_value: "", stage: "lead", notes: "" });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl border border-border p-6 w-full max-w-md">
        <h3 className="font-semibold text-lg mb-4">Add Client Deal</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Company Name *</label>
            <input className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="National Glass Solutions" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Contact Name</label>
              <input className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="John Smith" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="+1..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="john@company.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Deal Value</label>
              <input type="number" className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm" value={form.deal_value} onChange={e => setForm(f => ({ ...f, deal_value: e.target.value }))} placeholder="15000" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Stage</label>
            <select className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm" value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
              {DEAL_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Context about this deal..." />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-md border border-border text-sm hover:bg-accent transition-colors">Cancel</button>
          <button
            onClick={() => {
              if (!form.company_name.trim()) return;
              onSave({ ...form, deal_value: form.deal_value ? Number(form.deal_value) : undefined });
            }}
            className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Add Deal
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function PipelinePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"contractors" | "deals">("contractors");
  const [showNewDeal, setShowNewDeal] = useState(false);

  const contractorPipelineFn = useServerFn(getContractorPipeline);
  const clientDealsFn = useServerFn(getClientDeals);
  const createDealFn = useServerFn(createDeal);
  const moveDealFn = useServerFn(moveDeal);

  const { data: pipeline } = useQuery({
    queryKey: ["contractor-pipeline"],
    queryFn: () => contractorPipelineFn(),
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["client-deals"],
    queryFn: () => clientDealsFn(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createDealFn({ data }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-deals"] }); setShowNewDeal(false); },
  });

  const moveMutation = useMutation({
    mutationFn: (data: { id: string; stage: string }) => moveDealFn({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-deals"] }),
  });

  const totalContractors = pipeline ? Object.values(pipeline).flat().length : 0;
  const activeContractors = pipeline?.active?.length ?? 0;
  const totalPipeline = deals.reduce((sum: number, d: any) => sum + (d.deal_value || 0), 0);
  const wonDeals = deals.filter((d: any) => d.stage === "won");
  const wonValue = wonDeals.reduce((sum: number, d: any) => sum + (d.deal_value || 0), 0);

  return (
    <div className="p-6 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Contractor qualification + client deals in one view</p>
        </div>
        {tab === "deals" && (
          <button onClick={() => setShowNewDeal(true)} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Add Deal
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Total Contractors</p>
          <p className="text-2xl font-bold mt-1">{totalContractors}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Active & Verified</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{activeContractors}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Pipeline Value</p>
          <p className="text-2xl font-bold mt-1">{totalPipeline > 0 ? fmt(totalPipeline) : "—"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Won Revenue</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{wonValue > 0 ? fmt(wonValue) : "—"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-muted rounded-lg p-1 w-fit">
        <button onClick={() => setTab("contractors")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "contractors" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <User className="h-4 w-4 inline mr-1.5" />Contractor Pipeline
        </button>
        <button onClick={() => setTab("deals")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "deals" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <Building2 className="h-4 w-4 inline mr-1.5" />Client Deals
        </button>
      </div>

      {/* Kanban Board */}
      {tab === "contractors" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {CONTRACTOR_STAGES.map(stage => {
            const items = pipeline?.[stage.key] ?? [];
            return (
              <div key={stage.key} className={`flex-shrink-0 w-64 rounded-xl border-2 ${stage.color} p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
                    <span className="font-semibold text-sm">{stage.label}</span>
                  </div>
                  <span className="text-xs font-medium bg-white/70 rounded-full px-2 py-0.5">{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No contractors</p>
                  )}
                  {items.map((item: any) => (
                    <ContractorCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "deals" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map(stage => {
            const items = deals.filter((d: any) => d.stage === stage.key);
            const stageValue = items.reduce((s: number, d: any) => s + (d.deal_value || 0), 0);
            return (
              <div key={stage.key} className={`flex-shrink-0 w-64 rounded-xl border-2 ${stage.color} p-3`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
                    <span className="font-semibold text-sm">{stage.label}</span>
                  </div>
                  <span className="text-xs font-medium bg-white/70 rounded-full px-2 py-0.5">{items.length}</span>
                </div>
                {stageValue > 0 && (
                  <p className="text-xs text-green-600 font-medium mb-2 pl-4">{fmt(stageValue)}</p>
                )}
                <div className="space-y-2 min-h-[100px]">
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No deals</p>
                  )}
                  {items.map((deal: any) => (
                    <DealCard key={deal.id} deal={deal} stages={DEAL_STAGES} onMove={(id, stage) => moveMutation.mutate({ id, stage })} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewDeal && (
        <NewDealModal onClose={() => setShowNewDeal(false)} onSave={(data) => createMutation.mutate(data)} />
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/pipeline")({
  component: PipelinePage,
});
