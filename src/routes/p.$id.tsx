import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, FileText, PlayCircle, Sparkles, PenLine, Camera, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { SignatureModal } from "@/components/SignatureModal";
import { readPrevailingWage } from "@/lib/prevailing-wage";
import { computeTotals, type MaterialLine, type LaborLine } from "@/lib/pricing";
import { normalizeTradeKey } from "@/lib/trade-playbooks";
import { getT, fmtMoney } from "@/lib/proposal-i18n";
import { toast } from "sonner";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { PhotoUploader } from "@/components/PhotoUploader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/p/$id")({
  component: PublicProposal,
  head: () => ({ meta: [{ title: "Your proposal" }] }),
});

function PublicProposal() {
  const { id } = Route.useParams();
  const [proposal, setProposal] = useState<any>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [tier, setTier] = useState<"good" | "better" | "best">("better");
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [sendEmail, setSendEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [showClientUpload, setShowClientUpload] = useState(false);
  const [savingClientPhotos, setSavingClientPhotos] = useState(false);
  const [clientSession, setClientSession] = useState<any>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [signedName, setSignedName] = useState<string>("");
  const [signedEmail, setSignedEmail] = useState<string>("");
  const [acceptedTierForDeposit, setAcceptedTierForDeposit] = useState<"good" | "better" | "best">("better");
  const [acceptedTotal, setAcceptedTotal] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/proposal?id=${encodeURIComponent(id)}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Proposal not found");
        setProposal(json.proposal);
        const loadedTier = (json.proposal.selected_tier as "good" | "better" | "best") || "better";
        setTier(loadedTier);
        if (json.proposal.client_email) setSendEmail(json.proposal.client_email);
        setContractor(json.contractor);
        // If proposal is already accepted, pre-populate deposit state from DB data
        if (json.proposal.status === "accepted") {
          setAccepted(true);
          setAcceptedTierForDeposit(loadedTier);
          setSignedName(json.proposal.client_name || "");
          setSignedEmail(json.proposal.client_email || "");
          // Compute the accepted total from stored materials/labor
          const mats = (json.proposal.materials || []) as MaterialLine[];
          const labs = (json.proposal.labor || []) as LaborLine[];
          const t = computeTotals(mats, labs, loadedTier, Number(json.proposal.tax_rate) || 0.07, Number(json.proposal.overhead_percentage) || 0);
          setAcceptedTotal(t.grandTotal);
          setDepositAmount(Math.round(t.grandTotal * 0.5 * 100) / 100);
        }
        const { data: { user } } = await supabase.auth.getUser();
        const owner = !!user && json.contractor?.user_id === user.id;
        if (owner) setIsOwner(true);
        if (user && !owner) setClientSession(user);
        // Track view only for non-owner visitors
        if (!owner) {
          fetch("/api/public/proposal-view", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proposalId: id }),
          }).catch(() => {});
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to load proposal");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function savePhotos(next: string[]) {
    setProposal((p: any) => ({ ...p, photos: next }));
    setSavingPhotos(true);
    const { error } = await supabase.from("proposals").update({ photos: next }).eq("id", id);
    setSavingPhotos(false);
    if (error) toast.error(error.message);
    else toast.success("Photos saved");
  }

  async function saveClientPhotos(next: string[]) {
    setProposal((p: any) => ({ ...p, client_photos: next }));
    setSavingClientPhotos(true);
    const { error } = await supabase.from("proposals").update({ photos: next }).eq("id", id);
    setSavingClientPhotos(false);
    if (error) toast.error(error.message);
    else toast.success("Photos uploaded — your contractor has been notified.");
  }

  async function sendToClient() {
    if (!sendEmail.trim()) { toast.error("Enter the client's email"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/public/send-proposal-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id, recipientEmail: sendEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || json.reason || "Failed to send");
      } else {
        setSentTo(sendEmail.trim());
        toast.success(`Proposal sent to ${sendEmail.trim()}`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const tLoading = getT(proposal?.language);
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{tLoading.loading}</div>;
  if (!proposal) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><FileText className="h-10 w-10 mx-auto text-muted-foreground" /><p className="mt-4">{tLoading.notFound}</p></div></div>;

  const materials = (proposal.materials || []) as MaterialLine[];
  const labor = (proposal.labor || []) as LaborLine[];
  const totals = computeTotals(materials, labor, tier, Number(proposal.tax_rate) || 0.07, Number(proposal.overhead_percentage) || 0);
  const brand = contractor?.primary_color || "#EC4899";
  const t = getT(proposal.language);
  const fmt = (n: number) => fmtMoney(n, proposal.language);
  const TIER_LABELS = t.tiers;
  const taxPct = `${Math.round((Number(proposal.tax_rate) || 0.07) * 100)}%`;
  const mediaUrls: string[] = Array.isArray(proposal.photos) ? proposal.photos : [];
  const clientMediaUrls: string[] = Array.isArray(proposal.client_photos) ? proposal.client_photos : [];
  const isVideoUrl = (url: string) => /\.(mp4|mov|webm)(\?|#|$)/i.test(url);
  // Narrative (prose) proposals — moving and other service verticals — hide the
  // Good/Better/Best tiers and line-item tables and render the written document.
  const isNarrative = proposal.raw_input?.proposal_format === "narrative";

  async function sign({ signatureName, signatureEmail }: { signatureName: string; signatureEmail: string; signatureDataUrl: string | null }) {
    setSigning(true);
    try {
      const res = await fetch("/api/public/accept-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: id,
          signatureName,
          signatureEmail: signatureEmail || null,
          acceptedTier: tier,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to accept proposal");
      setProposal((current: any) => current ? { ...current, status: "accepted", selected_tier: tier } : current);
      setAccepted(true);
      setAcceptedTierForDeposit(tier);
      setAcceptedTotal(totals.grandTotal);
      setDepositAmount(Math.round(totals.grandTotal * 0.5 * 100) / 100);
      setShowSignModal(false);
      setSignedName(signatureName);
      setSignedEmail(signatureEmail || "");
      toast.success("Proposal accepted! You'll receive a confirmation email shortly.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to accept proposal");
    }
    setSigning(false);
  }

  async function decline() {
    setDeclining(true);
    try {
      const res = await fetch("/api/public/decline-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id, reason: declineReason.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to decline");
      setProposal((current: any) => current ? { ...current, status: "declined" } : current);
      setDeclined(true);
      toast.success("Proposal declined. Your contractor was notified.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to decline");
    } finally {
      setDeclining(false);
    }
  }

  const prevailingWage = readPrevailingWage(proposal.raw_input);

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {prevailingWage?.notice && (
        <div className="bg-amber-100 border-b-2 border-amber-400 text-amber-900 px-4 sm:px-6 py-3 print:bg-amber-100">
          <div className="max-w-5xl mx-auto flex items-start gap-2 sm:gap-3">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="text-sm sm:text-base font-semibold leading-snug">{prevailingWage.notice}</p>
              {prevailingWage.rate && (
                <p className="text-xs sm:text-sm mt-1.5 text-amber-800 leading-snug">
                  Reference prevailing wage — {prevailingWage.rate.tradeLabel} ({prevailingWage.rate.state}): ~${prevailingWage.rate.base}/hr base + ${prevailingWage.rate.fringe}/hr fringe ={" "}
                  <span className="font-semibold">${prevailingWage.rate.total}/hr total</span>. Estimate only — confirm the official wage determination for the project's county.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {contractor?.logo_url ? (
              <img src={contractor.logo_url} alt="" className="h-10 w-auto" />
            ) : (
              <div className="h-10 w-10 rounded-md flex items-center justify-center" style={{ background: brand }}>
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <div className="font-display font-bold">{contractor?.business_name || "Jobbidder"}</div>
              <div className="text-xs text-muted-foreground">{contractor?.phone} {contractor?.email && `· ${contractor.email}`}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{t.proposal}</div>
            <div className="font-mono text-sm">{proposal.proposal_number}</div>
            <div className="mt-2">
              <DownloadPdfButton proposal={proposal} contractor={contractor} tier={tier} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-10">
          <Badge variant="secondary" className="mb-3">{t.preparedFor} {proposal.client_name}</Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight capitalize">{t.tradeProposal(proposal.trade_type || t.projectFallback)}</h1>
          {proposal.job_address && <p className="text-muted-foreground mt-2">{proposal.job_address}</p>}
        </div>

        {!isNarrative && (
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {(["good", "better", "best"] as const).map((t) => {
              const tt = computeTotals(materials, labor, t, Number(proposal.tax_rate) || 0.07, Number(proposal.overhead_percentage) || 0);
              const active = tier === t;
              return (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`text-left rounded-xl border-2 p-5 transition bg-card ${active ? "shadow-glow" : "border-border bg-card/50 hover:opacity-90"}`}
                  style={active ? { borderColor: brand, boxShadow: `0 0 0 1px ${brand}33, 0 12px 40px -12px ${brand}55` } : {}}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-semibold text-lg">{TIER_LABELS[t].name}</span>
                    {active && <Check className="h-5 w-5" style={{ color: brand }} />}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{TIER_LABELS[t].tagline}</p>
                  <div className="text-2xl font-display font-bold" style={active ? { color: brand } : {}}>{fmt(tt.grandTotal)}</div>
                </button>
              );
            })}
          </div>
        )}

        {proposal.scope_of_work && (
          <Card className="p-6 mb-6">
            <h2 className="font-display font-semibold text-xl mb-3">{isNarrative ? "Your Proposal" : t.scopeOfWork}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{proposal.scope_of_work}</p>
          </Card>
        )}

        {isOwner && (
          <Card className="p-6 mb-6 print:hidden border-dashed">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-semibold text-xl">{t.jobPhotos}</h2>
                <p className="text-xs text-muted-foreground">{t.jobPhotosHint}</p>
              </div>
              {savingPhotos && <span className="text-xs text-muted-foreground">{t.saving}</span>}
            </div>
            <PhotoUploader
              value={mediaUrls}
              onChange={savePhotos}
              prefix="proposal"
              max={8}
            />
          </Card>
        )}

        {!isOwner && mediaUrls.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="font-display font-semibold text-xl mb-4">{t.jobPhotos}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {mediaUrls.map((url: string, i: number) => {
                const video = isVideoUrl(url);
                return (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="relative block aspect-square overflow-hidden rounded-md border border-border bg-muted">
                    {video ? (
                      <>
                        <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                          <PlayCircle className="h-10 w-10 drop-shadow" />
                        </div>
                      </>
                    ) : (
                      <img src={url} alt={`Job media ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition" />
                    )}
                  </a>
                );
              })}
            </div>
          </Card>
        )}

        {!isOwner && clientSession && (
          <Card className="p-5 mb-6 print:hidden">
            <button
              type="button"
              onClick={() => setShowClientUpload((v) => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {clientMediaUrls.length > 0
                    ? `Job-site photos / videos (${clientMediaUrls.length})`
                    : "Add job-site photos or video"}
                </span>
                {clientMediaUrls.length === 0 && (
                  <span className="text-xs text-muted-foreground">(optional)</span>
                )}
              </div>
              {showClientUpload ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showClientUpload && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Help your contractor see the space. Upload photos or a short video of the room or area — they'll be added to your project file.
                </p>
                {savingClientPhotos && <p className="text-xs text-muted-foreground mb-2">Saving…</p>}
                <PhotoUploader
                  value={clientMediaUrls}
                  onChange={saveClientPhotos}
                  prefix="client"
                  max={8}
                />
              </div>
            )}
          </Card>
        )}

        {materials.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="font-display font-semibold text-xl mb-4">{t.materials}</h2>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">{t.item}</th><th className="text-right p-3">{t.qty}</th><th className="text-right p-3">{t.unitPrice}</th><th className="text-right p-3">{t.total}</th></tr></thead>
                <tbody>
                  {materials.map((m, i) => {
                    const unit = (m.sia_price ?? m.retail_price) || 0;
                    return (
                      <tr key={i} className="border-t border-border">
                        <td className="p-3"><div className="font-medium">{m.item}</div>{m.description && <div className="text-xs text-muted-foreground">{m.description}</div>}</td>
                        <td className="p-3 text-right">{m.qty} {m.unit}</td>
                        <td className="p-3 text-right font-mono">{fmt(unit)}</td>
                        <td className="p-3 text-right font-mono">{fmt(unit * m.qty)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totals.savings > 0 && (
              <div className="mt-3 text-sm rounded-md bg-green-500/10 text-green-400 px-3 py-2 inline-block">
                {t.savingsLine(fmt(totals.savings))}
              </div>
            )}
          </Card>
        )}

        {!isNarrative && labor.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="font-display font-semibold text-xl mb-4">{t.labor}</h2>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">{t.task}</th><th className="text-right p-3">{t.hours}</th><th className="text-right p-3">{t.rate}</th><th className="text-right p-3">{t.total}</th></tr></thead>
                <tbody>
                  {labor.map((l, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-3"><div className="font-medium">{l.task}</div>{l.description && <div className="text-xs text-muted-foreground">{l.description}</div>}</td>
                      <td className="p-3 text-right">{l.hours}</td>
                      <td className="p-3 text-right font-mono">{fmt(l.rate)}</td>
                      <td className="p-3 text-right font-mono">{fmt(l.hours * l.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {isNarrative ? (
          totals.grandTotal > 0 && (
            <Card className="p-6 mb-6">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <div className="font-display text-lg">Estimated Investment</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Final binding price is confirmed after your on-site or virtual survey.</div>
                </div>
                <span className="font-display text-3xl font-bold shrink-0" style={{ color: brand }}>{fmt(totals.grandTotal)}</span>
              </div>
            </Card>
          )
        ) : (
          <Card className="p-6 mb-6">
            <div className="space-y-2 text-sm">
              <Row label={t.materials} v={fmt(totals.materialsSia)} />
              <Row label={t.labor} v={fmt(totals.laborTotal)} />
              {isOwner ? (
                <OverheadRow
                  proposalId={id}
                  label={proposal.overhead_label || "General Conditions / Non-Measured Costs"}
                  percentage={Number(proposal.overhead_percentage) || 0}
                  amount={totals.overheadAmount}
                  tradeType={proposal.trade_type}
                  fmt={fmt}
                  onSaved={(pct) => setProposal((p: any) => ({ ...p, overhead_percentage: pct, overhead_source: "manual_override" }))}
                />
              ) : (
                totals.overheadAmount > 0 && (
                  <Row label={proposal.overhead_label || "General Conditions / Non-Measured Costs"} v={fmt(totals.overheadAmount)} />
                )
              )}
              <Row label={t.tax(taxPct)} v={fmt(totals.tax)} />
              <div className="border-t border-border pt-3 mt-3 flex justify-between items-center">
                <span className="font-display text-lg">{t.total}</span>
                <span className="font-display text-3xl font-bold" style={{ color: brand }}>{fmt(totals.grandTotal)}</span>
              </div>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {proposal.timeline && <Card className="p-5"><div className="text-xs text-muted-foreground uppercase mb-1">{t.timeline}</div><div className="font-medium">{proposal.timeline}</div></Card>}
          {proposal.warranty && <Card className="p-5"><div className="text-xs text-muted-foreground uppercase mb-1">{t.warranty}</div><div className="font-medium">{proposal.warranty}</div></Card>}
          <Card className="p-5"><div className="text-xs text-muted-foreground uppercase mb-1">{t.payment}</div><div className="font-medium">{proposal.payment_terms}</div></Card>
        </div>

        {Array.isArray(proposal.exclusions) && proposal.exclusions.length > 0 && (
          <Card className="p-6 mb-6">
            <h3 className="font-display font-semibold mb-3">{t.exclusions}</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              {proposal.exclusions.map((e: string, i: number) => <li key={i}>{e}</li>)}
            </ul>
          </Card>
        )}

        <Card className="p-8 border-primary/40 bg-gradient-to-br from-card to-accent/30">
          {accepted || proposal.status === "accepted" ? (
            <div className="text-center py-6">
              <div className="h-14 w-14 rounded-full bg-green-500/20 mx-auto flex items-center justify-center"><Check className="h-7 w-7 text-green-400" /></div>
              <h3 className="font-display text-2xl font-bold mt-4">{t.accepted}</h3>
              <p className="text-muted-foreground mt-2">{t.acceptedSub}</p>
              {isNarrative && (
                <p className="text-muted-foreground text-sm mt-2">Your mover will contact you to schedule your survey and confirm your date.</p>
              )}
              {!isNarrative && (depositPaid ? (
                <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <p className="text-green-400 font-semibold text-lg">✅ Deposit paid — you're all set!</p>
                  <p className="text-muted-foreground text-sm mt-1">Your contractor will be in touch shortly to confirm your start date.</p>
                </div>
              ) : (
                <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="font-semibold text-base mb-1">Secure your project start date</p>
                  <p className="text-muted-foreground text-sm mb-4">Pay your 50% deposit now to lock in your schedule. The remaining balance is due upon completion.</p>
                  {depositAmount && (
                    <p className="text-2xl font-bold mb-4" style={{ color: brand }}>
                      Deposit: {fmt(depositAmount)}
                    </p>
                  )}
                  <Button
                    size="lg"
                    className="w-full text-white font-semibold shadow-glow"
                    style={{ background: brand }}
                    disabled={depositLoading}
                    onClick={async () => {
                      setDepositLoading(true);
                      try {
                        const res = await fetch("/api/public/create-deposit-invoice", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            proposalId: proposal.id,
                            acceptedTier: acceptedTierForDeposit || proposal.selected_tier || tier,
                            totalAmount: acceptedTotal || totals.grandTotal,
                            signerName: signedName || proposal.client_name || "",
                            signerEmail: signedEmail || proposal.client_email || null,
                            signerPhone: proposal.client_phone || null,
                          }),
                        });
                        const json = await res.json();
                        if (!res.ok || !json.success) throw new Error(json.error || "Could not create deposit invoice");
                        setDepositAmount(json.depositAmount);
                        // Redirect to GHL hosted payment page
                        window.open(json.paymentUrl, "_blank");
                        setDepositPaid(true);
                      } catch (e: any) {
                        toast.error(e.message || "Could not create deposit invoice. Please contact your contractor.");
                      } finally {
                        setDepositLoading(false);
                      }
                    }}
                  >
                    {depositLoading ? "Creating invoice..." : `Pay 50% Deposit${depositAmount ? ` — ${fmt(depositAmount)}` : ""}`}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">Secure payment powered by Stripe. You will be redirected to a hosted payment page.</p>
                </div>
              ))}
            </div>
          ) : declined || proposal.status === "declined" ? (
            <div className="text-center py-6">
              <h3 className="font-display text-2xl font-bold mt-4">{t.declined}</h3>
              <p className="text-muted-foreground mt-2">{t.declinedSub}</p>
            </div>
          ) : (
            <>
              <h3 className="font-display text-2xl font-bold mb-2">{t.acceptThisProposal}</h3>
              <p className="text-sm text-muted-foreground mb-5">{isNarrative ? "Accepting confirms the scope and terms in this proposal. Your final binding price is confirmed after your survey." : t.selectedTier(TIER_LABELS[tier].name, fmt(totals.grandTotal))}</p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="shadow-glow text-white font-semibold" style={{ background: brand }} onClick={() => setShowSignModal(true)} disabled={signing}>
                  <PenLine className="h-4 w-4 mr-2" />
                  {isNarrative ? "Accept & Sign" : t.acceptAndSign(fmt(totals.grandTotal))}
                </Button>
                {!showDecline ? (
                  <Button size="lg" variant="outline" onClick={() => setShowDecline(true)} disabled={signing}>
                    {t.decline}
                  </Button>
                ) : null}
              </div>
              {showDecline && (
                <div className="mt-5 pt-5 border-t border-border">
                  <Label>{t.declineReasonLabel}</Label>
                  <Input
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder={t.declineReasonPh}
                    className="mt-1"
                  />
                  <div className="flex gap-3 mt-3">
                    <Button variant="destructive" onClick={decline} disabled={declining}>
                      {declining ? t.submitting : t.confirmDecline}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowDecline(false)} disabled={declining}>
                      {t.cancel}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        <SignatureModal
          open={showSignModal}
          onClose={() => setShowSignModal(false)}
          onSign={sign}
          tier={tier}
          tierLabel={TIER_LABELS[tier].name}
          totalAmount={fmt(totals.grandTotal)}
          proposalNumber={proposal.proposal_number}
          brand={brand}
          clientEmail={proposal.client_email || ""}
          signing={signing}
        />

        <Card className="p-6 mt-6 print:hidden">
          <h3 className="font-display text-lg font-bold mb-2">{t.sendToClient}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t.sendToClientHint}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              placeholder="client@example.com"
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={sendToClient} disabled={sending}>
              {sending ? t.sending : t.sendBtn}
            </Button>
          </div>
          {sentTo && (
            <p className="text-xs text-green-400 mt-3">{t.sentTo(sentTo)}</p>
          )}
        </Card>

        <div className="flex flex-col items-center gap-3 mt-12 pt-8 border-t border-border/40">
          <img
            src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/S1DwV6RpRVZL2ZtYEo16/media/689ba94c7b7578a4c3bbeead.jpeg"
            alt="Sudden Impact Agency"
            className="h-12 w-12 rounded-md object-cover opacity-90"
          />
          <p className="text-center text-xs text-muted-foreground">
            Powered by <span className="text-gradient-sia font-semibold">Jobbidder</span> · A product of{" "}
            <a href="https://suddenimpactagency.io" target="_blank" rel="noreferrer" className="hover:text-foreground transition">
              Sudden Impact Agency
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-mono">{v}</span></div>;
}

function OverheadRow({
  proposalId,
  label,
  percentage,
  amount,
  tradeType,
  fmt,
  onSaved,
}: {
  proposalId: string;
  label: string;
  percentage: number;
  amount: number;
  tradeType: string | null;
  fmt: (n: number) => string;
  onSaved: (pct: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(percentage));
  const [saving, setSaving] = useState(false);

  async function save() {
    const pct = Math.max(0, Number(value) || 0);
    setSaving(true);
    try {
      const source = pct === 0 ? "none" : "manual_override";
      const { error } = await supabase
        .from("proposals")
        .update({ overhead_percentage: pct, overhead_source: source })
        .eq("id", proposalId);
      if (error) { toast.error(error.message); return; }

      // Persist as the new default for this trade so future proposals start here.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: contractorRow } = await supabase
          .from("contractors")
          .select("id, pricing_settings")
          .eq("user_id", user.id)
          .maybeSingle();
        if (contractorRow) {
          const tradeKey = normalizeTradeKey(tradeType);
          const settings = { ...(contractorRow.pricing_settings as any || {}) };
          settings.trades = { ...(settings.trades || {}) };
          settings.trades[tradeKey] = { ...(settings.trades[tradeKey] || {}), overhead: pct };
          await supabase.from("contractors").update({ pricing_settings: settings }).eq("id", contractorRow.id);
        }
      }

      onSaved(pct);
      setEditing(false);
      toast.success("Overhead updated");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex justify-between items-center">
        <button type="button" onClick={() => { setValue(String(percentage)); setEditing(true); }} className="text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2">
          {label} ({percentage}%)
        </button>
        <span className="font-mono">{fmt(amount)}</span>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 w-20 text-right font-mono text-sm"
          disabled={saving}
        />
        <span className="text-muted-foreground text-xs">%</span>
        <Button size="sm" className="h-7 px-2 text-xs" onClick={save} disabled={saving}>{saving ? "…" : "Save"}</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}