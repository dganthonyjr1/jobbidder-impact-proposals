import { useRef, useState, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, RotateCcw, PenLine, Type } from "lucide-react";

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSign: (params: { signatureName: string; signatureEmail: string; signatureDataUrl: string | null }) => Promise<void>;
  tier: "good" | "better" | "best";
  tierLabel: string;
  totalAmount: string;
  proposalNumber: string;
  brand: string;
  clientEmail?: string;
  signing: boolean;
}

type SignMode = "draw" | "type";

export function SignatureModal({
  open,
  onClose,
  onSign,
  tier,
  tierLabel,
  totalAmount,
  proposalNumber,
  brand,
  clientEmail = "",
  signing,
}: SignatureModalProps) {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [mode, setMode] = useState<SignMode>("draw");
  const [signName, setSignName] = useState("");
  const [signEmail, setSignEmail] = useState(clientEmail);
  const [agreed, setAgreed] = useState(false);
  const [canvasEmpty, setCanvasEmpty] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearCanvas = useCallback(() => {
    sigCanvasRef.current?.clear();
    setCanvasEmpty(true);
  }, []);

  const handleCanvasEnd = useCallback(() => {
    setCanvasEmpty(sigCanvasRef.current?.isEmpty() ?? true);
  }, []);

  async function handleSubmit() {
    setError(null);
    if (!signName.trim()) { setError("Please enter your full legal name."); return; }
    if (!agreed) { setError("You must agree to the terms to sign."); return; }
    if (mode === "draw" && canvasEmpty) { setError("Please draw your signature above."); return; }

    let dataUrl: string | null = null;
    if (mode === "draw" && sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");
    }

    await onSign({ signatureName: signName.trim(), signatureEmail: signEmail.trim(), signatureDataUrl: dataUrl });
  }

  if (!open) return null;

  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="font-display text-xl font-bold">Sign & Accept Proposal</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{proposalNumber} · {tierLabel} · {totalAmount}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition rounded-md p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Name + Email */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Full legal name <span className="text-destructive">*</span></Label>
              <Input
                value={signName}
                onChange={(e) => setSignName(e.target.value)}
                placeholder="Enter your full name as it appears on your ID"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email address <span className="text-muted-foreground text-xs">(optional — for your copy)</span></Label>
              <Input
                type="email"
                value={signEmail}
                onChange={(e) => setSignEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1"
              />
            </div>
          </div>

          {/* Signature area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Signature <span className="text-destructive">*</span></Label>
              <div className="flex gap-1 rounded-md border border-border p-0.5 bg-muted/30">
                <button
                  onClick={() => setMode("draw")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${mode === "draw" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <PenLine className="h-3.5 w-3.5" /> Draw
                </button>
                <button
                  onClick={() => setMode("type")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${mode === "type" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Type className="h-3.5 w-3.5" /> Type
                </button>
              </div>
            </div>

            {mode === "draw" ? (
              <div className="relative rounded-xl border-2 border-dashed border-border bg-white overflow-hidden" style={{ height: 140 }}>
                <SignatureCanvas
                  ref={sigCanvasRef}
                  penColor="#1a1a2e"
                  canvasProps={{ className: "w-full h-full", style: { width: "100%", height: "100%" } }}
                  onEnd={handleCanvasEnd}
                />
                {canvasEmpty && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-300 text-sm select-none">Sign here with your mouse or finger</p>
                  </div>
                )}
                <button
                  onClick={clearCanvas}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition bg-white/80 rounded p-1"
                  title="Clear signature"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-4 right-4 border-t border-gray-200 pointer-events-none" />
              </div>
            ) : (
              <div
                className="rounded-xl border-2 border-dashed border-border bg-white px-4 py-3 min-h-[140px] flex items-center"
                style={{ fontFamily: "'Dancing Script', cursive, serif" }}
              >
                {signName ? (
                  <span className="text-4xl text-gray-800" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}>
                    {signName}
                  </span>
                ) : (
                  <span className="text-gray-300 text-sm">Your typed name will appear here as your signature</span>
                )}
              </div>
            )}
          </div>

          {/* Legal disclosure */}
          <div className="rounded-lg bg-muted/30 border border-border p-4 text-xs text-muted-foreground space-y-1.5">
            <p><strong className="text-foreground">Proposal:</strong> {proposalNumber}</p>
            <p><strong className="text-foreground">Selected tier:</strong> {tierLabel} — {totalAmount}</p>
            <p><strong className="text-foreground">Date:</strong> {now}</p>
            <p className="pt-1 leading-relaxed">
              By signing, you agree to the scope of work, pricing, payment terms, and exclusions described in this proposal.
              This constitutes a legally binding electronic signature under the Electronic Signatures in Global and National Commerce Act (E-SIGN) and applicable state law.
            </p>
          </div>

          {/* Agreement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded"
            />
            <span className="text-sm text-muted-foreground leading-snug">
              I have read and agree to the terms of this proposal. I understand this is a legally binding electronic signature.
            </span>
          </label>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              size="lg"
              className="flex-1 text-white font-semibold shadow-glow"
              style={{ background: brand }}
              onClick={handleSubmit}
              disabled={signing || !agreed || !signName.trim() || (mode === "draw" && canvasEmpty)}
            >
              {signing ? (
                <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" /> Submitting…</span>
              ) : (
                <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Sign & Accept {totalAmount}</span>
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={onClose} disabled={signing}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
