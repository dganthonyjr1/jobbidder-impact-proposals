import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { UploadCloud, FileCheck2, X } from "lucide-react";
import { JobbidderLogo } from "@/components/JobbidderLogo";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const TRADE_OPTIONS = [
  // ── Installation ──────────────────────────────────────────────────────────
  "Window Film Installation",
  "Commercial Glazing",
  "Glass Installation",
  "Residential Windows & Doors",
  "Storefront / Curtain Wall",
  "Shower / Bath Glass",
  "Mirror Installation",
  "Auto Glass",
  // ── Building Perimeter Hardening ──────────────────────────────────────────
  "Building Perimeter Hardening",
  "Security Film Installation",
  "Blast-Resistant Glazing",
  // ── Design ────────────────────────────────────────────────────────────────
  "Glazing / Fenestration Design",
  // ── Building Modeling / Energy Engineering ────────────────────────────────
  "Building Energy Modeling",
  "Energy Engineering",
  // ── Sustainability ────────────────────────────────────────────────────────
  "Sustainability / LEED Consulting",
  // ── Production ────────────────────────────────────────────────────────────
  "Glass Fabrication & Production",
  // ── Project Management ────────────────────────────────────────────────────
  "Project Management",
  // ── National Retail Rollouts ──────────────────────────────────────────────
  "National Retail Rollouts",
  // ── Grant / Incentive Consulting ──────────────────────────────────────────
  "Energy Grant / Incentive Consulting",
  // ── General ───────────────────────────────────────────────────────────────
  "General Contracting",
  "Other",
];

export const Route = createFileRoute("/contractor-apply")({
  head: () => ({ meta: [{ title: "Contractor Application — Jobbidder" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    phone: typeof s.phone === "string" ? decodeURIComponent(s.phone) : "",
    email: typeof s.email === "string" ? decodeURIComponent(s.email) : "",
    name: typeof s.name === "string" ? decodeURIComponent(s.name) : "",
    ghl_id: typeof s.ghl_id === "string" ? s.ghl_id : "",
  }),
  component: ContractorApplyPage,
});

type UploadedDoc = { name: string; url: string };

function DocUploader({
  label,
  hint,
  value,
  onChange,
  fieldKey,
}: {
  label: string;
  hint: string;
  value: UploadedDoc | null;
  onChange: (doc: UploadedDoc | null) => void;
  fieldKey: string;
}) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Please upload a PDF or image (JPG, PNG, WebP, HEIC).");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error(`${file.name} exceeds 20 MB.`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const path = `anon/${fieldKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("contractor-docs")
        .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
      if (error) {
        toast.error(error.message);
        return;
      }
      const { data: pub } = supabase.storage.from("contractor-docs").getPublicUrl(path);
      onChange({ name: file.name, url: pub.publicUrl });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {value ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
          <FileCheck2 className="h-4 w-4 text-green-500 shrink-0" />
          <span className="flex-1 truncate">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-6 text-muted-foreground hover:border-primary transition">
          <UploadCloud className="h-6 w-6" />
          <span className="text-sm">{uploading ? "Uploading…" : "Click to upload"}</span>
          <input
            ref={ref}
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

function ContractorApplyPage() {
  const { phone: initPhone, email: initEmail, name: initName, ghl_id } = Route.useSearch();

  const [name, setName] = useState(initName);
  const [phone, setPhone] = useState(initPhone);
  const [email, setEmail] = useState(initEmail);
  const [tradeType, setTradeType] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseDoc, setLicenseDoc] = useState<UploadedDoc | null>(null);
  const [insuranceDoc, setInsuranceDoc] = useState<UploadedDoc | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required.");
      return;
    }
    if (!licenseDoc) {
      toast.error("Please upload your contractor's license.");
      return;
    }
    if (!insuranceDoc) {
      toast.error("Please upload your certificate of insurance.");
      return;
    }
    if (!agreedToTerms) {
      toast.error("Please agree to the terms to continue.");
      return;
    }
    if (!smsConsent) {
      toast.error("Please agree to receive SMS updates to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/contractor-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ghl_contact_id: ghl_id || null,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          trade_type: tradeType || null,
          years_experience: yearsExp || null,
          service_area: serviceArea.trim() || null,
          license_number: licenseNumber.trim() || null,
          license_url: licenseDoc.url,
          insurance_url: insuranceDoc.url,
          agrees_to_terms: agreedToTerms,
          sms_opted_in: smsConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Submission failed. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-lg p-8 text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h1 className="font-display text-2xl font-semibold">Application Received!</h1>
          <p className="text-muted-foreground">
            Thanks, {name.split(" ")[0]}! We've received your documents and our team has been
            notified. Someone will follow up with you shortly to complete your onboarding.
          </p>
          <p className="text-sm text-muted-foreground">You can close this window.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <Link to="/"><JobbidderLogo size="md" /></Link>
          </div>
          <h1 className="font-display text-2xl font-bold">Contractor Application</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete the form below to get onboarded as a certified contractor. All documents are
            reviewed before any human follow-up takes place.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-base">Personal Information</h2>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </Card>

          {/* Business Info */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-base">Business Information</h2>
            <div className="space-y-2">
              <Label htmlFor="trade">Trade / Specialty</Label>
              <select
                id="trade"
                value={tradeType}
                onChange={(e) => setTradeType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select a trade…</option>
                {TRADE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="years">Years of Experience</Label>
              <select
                id="years"
                value={yearsExp}
                onChange={(e) => setYearsExp(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select…</option>
                <option value="0-1">Less than 1 year</option>
                <option value="1-3">1–3 years</option>
                <option value="3-5">3–5 years</option>
                <option value="5-10">5–10 years</option>
                <option value="10+">10+ years</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Service Area</Label>
              <Input
                id="area"
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                placeholder="e.g. Greater Philadelphia, PA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license">License Number</Label>
              <Input
                id="license"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. PA-12345678"
              />
            </div>
          </Card>

          {/* Documents */}
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-base">Required Documents</h2>
              <p className="text-xs text-muted-foreground mt-1">
                PDF or image up to 20 MB each. These are reviewed before any interview takes place.
              </p>
            </div>
            <DocUploader
              label="Contractor's License *"
              hint="Upload a clear photo or PDF of your current contractor's license."
              value={licenseDoc}
              onChange={setLicenseDoc}
              fieldKey="license"
            />
            <DocUploader
              label="Certificate of Insurance *"
              hint="Upload your current COI showing general liability coverage."
              value={insuranceDoc}
              onChange={setInsuranceDoc}
              fieldKey="insurance"
            />
          </Card>

          {/* Agreement & Consent */}
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-base">Agreement &amp; Consent</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Both boxes must be checked to submit.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                I confirm that all information and documents I have provided are accurate and current.
                I understand that submitting this application does not guarantee placement and that my
                documents will be reviewed before any follow-up contact is made. I agree to
                Jobbidder's{" "}
                <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>
                {" "}and{" "}
                <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                I agree to receive automated SMS/text messages and AI-assisted voice calls from
                Jobbidder (operated by Sudden Impact Agency LLC) at the phone number provided above,
                regarding my application status, onboarding steps, and job opportunities. Message
                frequency varies. Message &amp; data rates may apply.{" "}
                <strong className="text-foreground/80">Consent is not a condition of any purchase or service.</strong>{" "}
                Reply <strong className="text-foreground/80">STOP</strong> to any text to opt out at any time. See{" "}
                <Link to="/sms-terms" className="underline hover:text-foreground">SMS Terms</Link>.
              </span>
            </label>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Application"}
          </Button>
        </form>
      </div>
    </div>
  );
}
