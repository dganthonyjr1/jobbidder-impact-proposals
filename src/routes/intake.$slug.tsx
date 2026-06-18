import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/intake/$slug")({
  head: () => ({ meta: [{ title: "Request your estimate" }] }),
  component: IntakeForm,
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
  successBody: (business: string) => string;
  viewProposal: string;
  consent: (business: string) => string;
  smsTerms: string;
  privacy: string;
  freeEstimateFrom: string;
};

const UI: Record<Lang, LangUI> = {
  en: {
    heading: "Tell us about your project",
    subheading: "We'll send you a detailed proposal within a few minutes.",
    nameLabel: "Your name *",
    phoneLabel: "Phone *",
    emailLabel: "Email *",
    addressLabel: "Job address",
    jobTypeLabel: "Job type",
    jobTypePh: "Roof replacement, kitchen remodel…",
    descLabel: "Describe what you need *",
    descPh: "The more detail you share, the more accurate your estimate.",
    submitBtn: "Get my estimate",
    submitting: "Submitting…",
    successHeading: "Thanks — we're on it",
    successBody: (b) => `${b} just received your request. We're drafting your estimate now and you'll get it by email and text within a few minutes.`,
    viewProposal: "View your proposal",
    consent: (b) => `By submitting, you authorize ${b} (powered by Jobbidder / Sudden Impact Agency LLC) to send you transactional text messages and emails about your estimate at the contact info above, possibly using automated technology. Msg & data rates may apply. Message frequency varies. Consent is not a condition of purchase. Reply STOP to cancel, HELP for help.`,
    smsTerms: "SMS Terms",
    privacy: "Privacy Policy",
    freeEstimateFrom: "Free estimate from",
  },
  es: {
    heading: "Cuéntanos sobre tu proyecto",
    subheading: "Te enviaremos una propuesta detallada en pocos minutos.",
    nameLabel: "Tu nombre *",
    phoneLabel: "Teléfono *",
    emailLabel: "Correo electrónico *",
    addressLabel: "Dirección del trabajo",
    jobTypeLabel: "Tipo de trabajo",
    jobTypePh: "Reemplazo de techo, remodelación de cocina…",
    descLabel: "Describe lo que necesitas *",
    descPh: "Cuantos más detalles compartas, más preciso será tu presupuesto.",
    submitBtn: "Obtener mi presupuesto",
    submitting: "Enviando…",
    successHeading: "Gracias — ya estamos en ello",
    successBody: (b) => `${b} acaba de recibir tu solicitud. Estamos preparando tu presupuesto y lo recibirás por correo y mensaje de texto en pocos minutos.`,
    viewProposal: "Ver tu propuesta",
    consent: (b) => `Al enviar, autorizas a ${b} (con tecnología de Jobbidder / Sudden Impact Agency LLC) a enviarte mensajes de texto y correos transaccionales sobre tu presupuesto. Pueden aplicar tarifas de mensajes y datos. Responde STOP para cancelar, HELP para ayuda.`,
    smsTerms: "Términos SMS",
    privacy: "Política de privacidad",
    freeEstimateFrom: "Presupuesto gratuito de",
  },
  fr: {
    heading: "Parlez-nous de votre projet",
    subheading: "Nous vous enverrons une proposition détaillée en quelques minutes.",
    nameLabel: "Votre nom *",
    phoneLabel: "Téléphone *",
    emailLabel: "Courriel *",
    addressLabel: "Adresse du chantier",
    jobTypeLabel: "Type de travaux",
    jobTypePh: "Remplacement de toiture, rénovation de cuisine…",
    descLabel: "Décrivez ce dont vous avez besoin *",
    descPh: "Plus vous donnez de détails, plus votre estimation sera précise.",
    submitBtn: "Obtenir mon estimation",
    submitting: "Envoi…",
    successHeading: "Merci — nous nous en occupons",
    successBody: (b) => `${b} vient de recevoir votre demande. Nous préparons votre estimation et vous la recevrez par courriel et SMS dans quelques minutes.`,
    viewProposal: "Voir votre proposition",
    consent: (b) => `En soumettant, vous autorisez ${b} (propulsé par Jobbidder / Sudden Impact Agency LLC) à vous envoyer des messages transactionnels par SMS et courriel concernant votre estimation. Des frais peuvent s'appliquer. Répondez STOP pour annuler, HELP pour de l'aide.`,
    smsTerms: "Conditions SMS",
    privacy: "Politique de confidentialité",
    freeEstimateFrom: "Estimation gratuite de",
  },
  pt: {
    heading: "Fale sobre o seu projeto",
    subheading: "Enviaremos uma proposta detalhada em poucos minutos.",
    nameLabel: "Seu nome *",
    phoneLabel: "Telefone *",
    emailLabel: "E-mail *",
    addressLabel: "Endereço do serviço",
    jobTypeLabel: "Tipo de serviço",
    jobTypePh: "Substituição de telhado, reforma de cozinha…",
    descLabel: "Descreva o que você precisa *",
    descPh: "Quanto mais detalhes você compartilhar, mais preciso será o orçamento.",
    submitBtn: "Obter meu orçamento",
    submitting: "Enviando…",
    successHeading: "Obrigado — já estamos nisso",
    successBody: (b) => `${b} acabou de receber sua solicitação. Estamos preparando seu orçamento e você o receberá por e-mail e SMS em poucos minutos.`,
    viewProposal: "Ver sua proposta",
    consent: (b) => `Ao enviar, você autoriza ${b} (com tecnologia Jobbidder / Sudden Impact Agency LLC) a enviar mensagens de texto e e-mails transacionais sobre seu orçamento. Tarifas podem ser aplicadas. Responda STOP para cancelar, HELP para ajuda.`,
    smsTerms: "Termos de SMS",
    privacy: "Política de privacidade",
    freeEstimateFrom: "Orçamento gratuito de",
  },
  ht: {
    heading: "Pale nou sou pwojè ou",
    subheading: "Nou pral voye yon pwopozisyon detaye nan kèk minit.",
    nameLabel: "Non ou *",
    phoneLabel: "Telefòn *",
    emailLabel: "Imèl *",
    addressLabel: "Adrès travay la",
    jobTypeLabel: "Kalite travay",
    jobTypePh: "Ranplasman do kay, renovasyon kwizin…",
    descLabel: "Dekri sa ou bezwen *",
    descPh: "Plis detay ou pataje, plis estimasyon ou an pral egzak.",
    submitBtn: "Jwenn estimasyon mwen",
    submitting: "K ap voye…",
    successHeading: "Mèsi — nou okipe sa",
    successBody: (b) => `${b} fèk resevwa demann ou. Nou ap prepare estimasyon ou epi ou pral resevwa li pa imèl ak mesaj tèks nan kèk minit.`,
    viewProposal: "Wè pwopozisyon ou an",
    consent: (b) => `Lè ou soumèt, ou otorize ${b} (alimante pa Jobbidder / Sudden Impact Agency LLC) pou voye mesaj tèks ak imèl transaksyonèl sou estimasyon ou. Frè ka aplike. Reponn STOP pou kanpe, HELP pou èd.`,
    smsTerms: "Tèm SMS",
    privacy: "Politik konfidansyalite",
    freeEstimateFrom: "Estimasyon gratis de",
  },
};

function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const nav = navigator.language || "";
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("ht") || nav.startsWith("hat")) return "ht";
  return "en";
}

function IntakeForm() {
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
      const res = await fetch("/api/public/intake-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form, language: lang }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Submission failed");
      setDone({ url: json.proposal_url });
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
          <p className="text-muted-foreground mt-2">This intake link isn't active.</p>
        </Card>
      </div>
    );
  }

  const brand = contractor.primary_color || "#EC4899";
  const t = UI[lang];

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <Card className="p-10 max-w-lg text-center">
          <CheckCircle2 className="h-14 w-14 mx-auto text-green-400" />
          <h1 className="font-display text-3xl font-bold mt-4">{t.successHeading}</h1>
          <p className="text-muted-foreground mt-3">
            {t.successBody(contractor.business_name)}
          </p>
          <a href={done.url} className="inline-block mt-6 text-sm underline">{t.viewProposal}</a>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {contractor.logo_url ? (
              <img src={contractor.logo_url} alt="" className="h-12 w-auto" />
            ) : (
              <div className="h-12 w-12 rounded-md flex items-center justify-center" style={{ background: brand }}>
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{t.freeEstimateFrom}</div>
              <h1 className="font-display text-2xl font-bold">{contractor.business_name}</h1>
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
                <Sparkles className="h-4 w-4 mr-2" />
                {submitting ? t.submitting : t.submitBtn}
              </Button>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.consent(contractor.business_name)}{' '}
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
