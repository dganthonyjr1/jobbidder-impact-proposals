import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Calculator, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/intake/$slug/estimate")({
  head: () => ({ meta: [{ title: "Get a free estimate" }] }),
  component: EstimateIntakeForm,
});

type Lang = "en" | "es" | "fr" | "pt" | "ht";

const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "pt", label: "Português", flag: "🇧🇷" },
  { value: "ht", label: "Kreyòl", flag: "🇭🇹" },
];

type LangUI = {
  heading: string;
  subheading: string;
  nameLabel: string;
  phoneLabel: string;
  emailLabel: string;
  addressLabel: string;
  jobTypeLabel: string;
  jobTypePh: string;
  descLabel: string;
  descPh: string;
  submitBtn: string;
  submitting: string;
  successHeading: string;
  successBody: (b: string) => string;
  viewEstimate: string;
  freeEstimateFrom: string;
  consent: (b: string) => string;
  smsTerms: string;
  privacy: string;
  wantFullProposal: string;
};

const UI: Record<Lang, LangUI> = {
  en: {
    heading: "Get a free ballpark estimate",
    subheading: "Tell us about your project and we'll send you a quick price range — no commitment required.",
    nameLabel: "Your name",
    phoneLabel: "Phone number",
    emailLabel: "Email address",
    addressLabel: "Job address (optional)",
    jobTypeLabel: "Type of work",
    jobTypePh: "Roof replacement, kitchen remodel…",
    descLabel: "Describe your project",
    descPh: "The more detail you share, the more accurate your estimate.",
    submitBtn: "Get my free estimate",
    submitting: "Generating estimate…",
    successHeading: "Your estimate is on its way!",
    successBody: (b) => `${b} just received your request. Your free estimate will arrive by email and text within a few minutes.`,
    viewEstimate: "View your estimate",
    freeEstimateFrom: "Free estimate from",
    consent: (b) => `By submitting, you authorize ${b} (powered by Jobbidder / Sudden Impact Agency LLC) to send you transactional text messages and emails about your estimate at the contact info above, possibly using automated technology. Msg & data rates may apply. Message frequency varies. Consent is not a condition of purchase. Reply STOP to cancel, HELP for help.`,
    smsTerms: "SMS Terms",
    privacy: "Privacy Policy",
    wantFullProposal: "Want a detailed proposal instead?",
  },
  es: {
    heading: "Obtén un presupuesto gratuito",
    subheading: "Cuéntanos sobre tu proyecto y te enviaremos un rango de precios rápido — sin compromiso.",
    nameLabel: "Tu nombre",
    phoneLabel: "Número de teléfono",
    emailLabel: "Correo electrónico",
    addressLabel: "Dirección del trabajo (opcional)",
    jobTypeLabel: "Tipo de trabajo",
    jobTypePh: "Reemplazo de techo, remodelación de cocina…",
    descLabel: "Describe tu proyecto",
    descPh: "Cuantos más detalles compartas, más preciso será tu presupuesto.",
    submitBtn: "Obtener mi presupuesto gratuito",
    submitting: "Generando presupuesto…",
    successHeading: "¡Tu presupuesto está en camino!",
    successBody: (b) => `${b} acaba de recibir tu solicitud. Tu presupuesto gratuito llegará por correo y mensaje de texto en unos minutos.`,
    viewEstimate: "Ver tu presupuesto",
    freeEstimateFrom: "Presupuesto gratuito de",
    consent: (b) => `Al enviar, autorizas a ${b} (impulsado por Jobbidder / Sudden Impact Agency LLC) a enviarte mensajes de texto y correos transaccionales sobre tu presupuesto, posiblemente usando tecnología automatizada. Pueden aplicar tarifas de mensajes y datos. Responde STOP para cancelar, HELP para ayuda.`,
    smsTerms: "Términos SMS",
    privacy: "Política de privacidad",
    wantFullProposal: "¿Quieres una propuesta detallada?",
  },
  fr: {
    heading: "Obtenez une estimation gratuite",
    subheading: "Parlez-nous de votre projet et nous vous enverrons une fourchette de prix rapide — sans engagement.",
    nameLabel: "Votre nom",
    phoneLabel: "Numéro de téléphone",
    emailLabel: "Adresse e-mail",
    addressLabel: "Adresse du chantier (optionnel)",
    jobTypeLabel: "Type de travaux",
    jobTypePh: "Remplacement de toiture, rénovation cuisine…",
    descLabel: "Décrivez votre projet",
    descPh: "Plus vous partagez de détails, plus votre estimation sera précise.",
    submitBtn: "Obtenir mon estimation gratuite",
    submitting: "Génération en cours…",
    successHeading: "Votre estimation est en route !",
    successBody: (b) => `${b} vient de recevoir votre demande. Votre estimation gratuite arrivera par e-mail et SMS dans quelques minutes.`,
    viewEstimate: "Voir votre estimation",
    freeEstimateFrom: "Estimation gratuite de",
    consent: (b) => `En soumettant, vous autorisez ${b} (propulsé par Jobbidder / Sudden Impact Agency LLC) à vous envoyer des messages transactionnels par SMS et e-mail concernant votre estimation, éventuellement via une technologie automatisée. Des frais de message et de données peuvent s'appliquer. Répondez STOP pour annuler, HELP pour de l'aide.`,
    smsTerms: "Conditions SMS",
    privacy: "Politique de confidentialité",
    wantFullProposal: "Vous voulez une proposition détaillée ?",
  },
  pt: {
    heading: "Obtenha um orçamento gratuito",
    subheading: "Conte-nos sobre seu projeto e enviaremos uma faixa de preço rápida — sem compromisso.",
    nameLabel: "Seu nome",
    phoneLabel: "Número de telefone",
    emailLabel: "Endereço de e-mail",
    addressLabel: "Endereço do serviço (opcional)",
    jobTypeLabel: "Tipo de serviço",
    jobTypePh: "Substituição de telhado, reforma de cozinha…",
    descLabel: "Descreva seu projeto",
    descPh: "Quanto mais detalhes você compartilhar, mais preciso será seu orçamento.",
    submitBtn: "Obter meu orçamento gratuito",
    submitting: "Gerando orçamento…",
    successHeading: "Seu orçamento está a caminho!",
    successBody: (b) => `${b} acabou de receber sua solicitação. Seu orçamento gratuito chegará por e-mail e mensagem de texto em alguns minutos.`,
    viewEstimate: "Ver seu orçamento",
    freeEstimateFrom: "Orçamento gratuito de",
    consent: (b) => `Ao enviar, você autoriza ${b} (desenvolvido por Jobbidder / Sudden Impact Agency LLC) a enviar mensagens de texto e e-mails transacionais sobre seu orçamento, possivelmente usando tecnologia automatizada. Taxas de mensagens e dados podem ser aplicadas. Responda STOP para cancelar, HELP para ajuda.`,
    smsTerms: "Termos de SMS",
    privacy: "Política de privacidade",
    wantFullProposal: "Quer uma proposta detalhada?",
  },
  ht: {
    heading: "Jwenn yon estimasyon gratis",
    subheading: "Di nou sou pwojè ou a epi nou pral voye yon ranje pri rapid — san angajman.",
    nameLabel: "Non ou",
    phoneLabel: "Nimewo telefòn",
    emailLabel: "Adrès imèl",
    addressLabel: "Adrès travay la (opsyonèl)",
    jobTypeLabel: "Kalite travay",
    jobTypePh: "Ranplasman do kay, renovasyon kwizin…",
    descLabel: "Dekri pwojè ou a",
    descPh: "Plis detay ou pataje, plis estimasyon ou a pral egzak.",
    submitBtn: "Jwenn estimasyon gratis mwen",
    submitting: "K ap jenere estimasyon…",
    successHeading: "Estimasyon ou a ap vini!",
    successBody: (b) => `${b} fèk resevwa demann ou a. Estimasyon gratis ou a pral rive pa imèl ak mesaj tèks nan kèk minit.`,
    viewEstimate: "Wè estimasyon ou a",
    freeEstimateFrom: "Estimasyon gratis de",
    consent: (b) => `Lè ou soumèt, ou otorize ${b} (alimante pa Jobbidder / Sudden Impact Agency LLC) pou voye mesaj tèks ak imèl transaksyonèl sou estimasyon ou a, posibleman itilize teknoloji otomatik. Frè mesaj ak done ka aplike. Reponn STOP pou anile, HELP pou èd.`,
    smsTerms: "Tèm SMS",
    privacy: "Politik Konfidansyalite",
    wantFullProposal: "Ou vle yon pwopozisyon detaye?",
  },
};

function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const nav = navigator.language?.toLowerCase() || "";
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("ht") || nav.startsWith("hat")) return "ht";
  return "en";
}

function EstimateIntakeForm() {
  const { slug } = Route.useParams();
  const [contractor, setContractor] = useState<{ business_name: string; primary_color: string | null; logo_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ url: string } | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [form, setForm] = useState({
    client_name: "", client_email: "", client_phone: "",
    job_address: "", trade_type: "", job_description: "",
  });

  useEffect(() => {
    setLang(detectLang());
    (async () => {
      const { data } = await supabase
        .from("contractors")
        .select("business_name, primary_color, logo_url")
        .eq("slug", slug)
        .maybeSingle();
      setContractor(data);
      setLoading(false);
    })();
  }, [slug]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/estimate-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form, language: lang }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Submission failed");
      setDone({ url: json.estimate_url });
    } catch (err: any) {
      toast.error(err?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!contractor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="font-display text-2xl font-bold">Not found</h1>
          <p className="text-muted-foreground mt-2">This estimate link isn't active.</p>
        </Card>
      </div>
    );
  }

  const brand = contractor.primary_color || "#FF6B00";
  const t = UI[lang];

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <Card className="p-10 max-w-lg text-center">
          <CheckCircle2 className="h-14 w-14 mx-auto text-green-400" />
          <h1 className="font-display text-3xl font-bold mt-4">{t.successHeading}</h1>
          <p className="text-muted-foreground mt-3">
            {t.successBody("Jobbidder")}
          </p>
          <a href={done.url} className="inline-block mt-6 text-sm underline">{t.viewEstimate}</a>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">{t.wantFullProposal}</p>
            <a href={`/intake/${slug}`} className="inline-block mt-2 text-sm font-semibold underline" style={{ color: brand }}>
              Request a detailed proposal →
            </a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md flex items-center justify-center bg-primary">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-gradient-sia">Jobbidder</h1>
              <div className="text-xs text-muted-foreground">AI Estimates · Powered by Sudden Impact Agency</div>
            </div>
          </div>
          {/* Language selector */}
          <div className="flex gap-1">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLang(opt.value)}
                title={opt.label}
                className={`text-lg px-1.5 py-0.5 rounded transition-all ${lang === opt.value ? "ring-2 ring-offset-1 scale-110" : "opacity-60 hover:opacity-100"}`}
                style={lang === opt.value ? { ringColor: brand } : {}}
              >
                {opt.flag}
              </button>
            ))}
          </div>
        </div>

        {/* Estimate vs Proposal distinction banner */}
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2">
          <Calculator className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            This form gives you a <strong>quick ballpark estimate</strong> with price ranges.
            {" "}<a href={`/intake/${slug}`} className="underline font-semibold">Click here for a detailed proposal</a> with itemized costs, Good/Better/Best options, and a signature line.
          </span>
        </div>

        <Card className="p-6">
          <h2 className="font-display text-xl font-bold mb-1">{t.heading}</h2>
          <p className="text-sm text-muted-foreground mb-6">{t.subheading}</p>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>{t.nameLabel}</Label><Input required value={form.client_name} onChange={(e) => set("client_name", e.target.value)} /></div>
              <div><Label>{t.phoneLabel}</Label><Input required type="tel" value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>{t.emailLabel}</Label><Input required type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>{t.addressLabel}</Label><Input value={form.job_address} onChange={(e) => set("job_address", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>{t.jobTypeLabel}</Label><Input value={form.trade_type} onChange={(e) => set("trade_type", e.target.value)} placeholder={t.jobTypePh} /></div>
            </div>
            <div>
              <Label>{t.descLabel}</Label>
              <Textarea required rows={5} value={form.job_description} onChange={(e) => set("job_description", e.target.value)} placeholder={t.descPh} />
            </div>
            <div className="space-y-3">
              <Button type="submit" size="lg" disabled={submitting} className="text-white w-full sm:w-auto" style={{ background: brand }}>
                <Calculator className="h-4 w-4 mr-2" />
                {submitting ? t.submitting : t.submitBtn}
              </Button>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.consent("Jobbidder / Sudden Impact Agency LLC")}{' '}
                <a href="/sms-terms" target="_blank" className="underline">{t.smsTerms}</a>{' '}·{' '}
                <a href="/privacy" target="_blank" className="underline">{t.privacy}</a>
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
