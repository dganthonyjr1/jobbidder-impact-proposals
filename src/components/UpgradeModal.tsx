import { X, Zap, ArrowUpRight } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  featureName: string;
  requiredPlan: string;
  upgradeUrl: string;
  description?: string;
}

const PLAN_COLORS: Record<string, string> = {
  "Journeyman": "text-blue-400",
  "Master GC": "text-emerald-400",
  "Principal": "text-purple-400",
  "Enterprise": "text-orange-400",
};

export function UpgradeModal({
  open,
  onClose,
  featureName,
  requiredPlan,
  upgradeUrl,
  description,
}: UpgradeModalProps) {
  if (!open) return null;

  const planColor = PLAN_COLORS[requiredPlan] ?? "text-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-accent/50 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Zap className="h-6 w-6 text-primary" />
        </div>

        <h2 className="text-xl font-bold mb-2">Upgrade to unlock {featureName}</h2>

        <p className="text-sm text-muted-foreground mb-4">
          {description || `${featureName} is available on the `}
          {!description && (
            <span className={`font-semibold ${planColor}`}>{requiredPlan}</span>
          )}
          {!description && " plan and above."}
        </p>

        <div className="rounded-xl border border-border bg-muted/30 p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-sm font-semibold ${planColor}`}>{requiredPlan} Plan</span>
            <span className="text-xs text-muted-foreground">— required</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            {requiredPlan === "Master GC" && (
              <>
                <li>✓ 500 AI credits/month</li>
                <li>✓ Voice Pre-Qualification</li>
                <li>✓ Document Extraction</li>
                <li>✓ SMS Sequences</li>
                <li>✓ White-label intake pages</li>
              </>
            )}
            {requiredPlan === "Journeyman" && (
              <>
                <li>✓ Unlimited AI proposals</li>
                <li>✓ Full pipeline management</li>
                <li>✓ Email notifications</li>
              </>
            )}
            {(requiredPlan === "Principal" || requiredPlan === "Enterprise") && (
              <>
                <li>✓ {requiredPlan === "Principal" ? "2,000" : "10,000"} credits/month</li>
                <li>✓ All Master GC features</li>
                <li>✓ Priority support</li>
              </>
            )}
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent/50 transition"
          >
            Not now
          </button>
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition"
          >
            Upgrade Now <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
