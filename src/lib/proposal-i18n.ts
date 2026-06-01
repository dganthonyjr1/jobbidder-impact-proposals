export type ProposalLang = "en" | "es" | "fr" | "pt" | "ht";

type Dict = {
  proposal: string;
  preparedFor: string;
  projectFallback: string;
  tradeProposal: (trade: string) => string;
  tiers: { good: { name: string; tagline: string }; better: { name: string; tagline: string }; best: { name: string; tagline: string } };
  scopeOfWork: string;
  jobPhotos: string;
  jobPhotosHint: string;
  saving: string;
  materials: string;
  labor: string;
  item: string;
  qty: string;
  unitPrice: string;
  total: string;
  task: string;
  hours: string;
  rate: string;
  savingsLine: (amount: string) => string;
  tax: (pct: string) => string;
  timeline: string;
  warranty: string;
  payment: string;
  exclusions: string;
  accepted: string;
  acceptedSub: string;
  declined: string;
  declinedSub: string;
  acceptThisProposal: string;
  selectedTier: (name: string, amount: string) => string;
  fullName: string;
  emailOptional: string;
  submitting: string;
  acceptAndSign: (amount: string) => string;
  decline: string;
  confirmDecline: string;
  cancel: string;
  declineReasonLabel: string;
  declineReasonPh: string;
  sendToClient: string;
  sendToClientHint: string;
  sendBtn: string;
  sending: string;
  sentTo: (email: string) => string;
  loading: string;
  notFound: string;
  downloadPdf: string;
};

const en: Dict = {
  proposal: "Proposal",
  preparedFor: "Prepared for",
  projectFallback: "Project",
  tradeProposal: (t) => `${t} Proposal`,
  tiers: {
    good: { name: "Good", tagline: "Essential quality, smart savings" },
    better: { name: "Better", tagline: "Recommended — best value" },
    best: { name: "Best", tagline: "Premium materials & finishes" },
  },
  scopeOfWork: "Scope of Work",
  jobPhotos: "Job-site media",
  jobPhotosHint: "Add up to 8 photos or videos. Appears on the PDF and the client gallery.",
  saving: "Saving…",
  materials: "Materials",
  labor: "Labor",
  item: "Item",
  qty: "Qty",
  unitPrice: "Unit price",
  total: "Total",
  task: "Task",
  hours: "Hours",
  rate: "Rate",
  savingsLine: (a) => `You save ${a} vs. retail thanks to Sudden Impact Agency wholesale pricing.`,
  tax: (p) => `Tax (${p})`,
  timeline: "Timeline",
  warranty: "Warranty",
  payment: "Payment",
  exclusions: "Exclusions",
  accepted: "Proposal accepted",
  acceptedSub: "Your contractor has been notified.",
  declined: "Proposal declined",
  declinedSub: "Your contractor has been notified.",
  acceptThisProposal: "Accept this proposal",
  selectedTier: (n, a) => `Selected tier: ${n} — ${a}. Type your full name to e-sign.`,
  fullName: "Full name",
  emailOptional: "Email (optional)",
  submitting: "Submitting…",
  acceptAndSign: (a) => `Accept & sign — ${a}`,
  decline: "Decline",
  confirmDecline: "Confirm decline",
  cancel: "Cancel",
  declineReasonLabel: "Reason for declining (optional)",
  declineReasonPh: "e.g. went with another quote, timing didn't work…",
  sendToClient: "Send to client",
  sendToClientHint: "Email this proposal directly to your client. Works with any inbox — Gmail, Outlook, Yahoo, Apple, business email or custom domain.",
  sendBtn: "Send proposal",
  sending: "Sending…",
  sentTo: (e) => `✓ Sent to ${e}`,
  loading: "Loading proposal…",
  notFound: "Proposal not found",
  downloadPdf: "Download PDF",
};

const es: Dict = {
  proposal: "Propuesta",
  preparedFor: "Preparada para",
  projectFallback: "Proyecto",
  tradeProposal: (t) => `Propuesta de ${t}`,
  tiers: {
    good: { name: "Básico", tagline: "Calidad esencial, ahorro inteligente" },
    better: { name: "Mejor", tagline: "Recomendado — mejor valor" },
    best: { name: "Premium", tagline: "Materiales y acabados premium" },
  },
  scopeOfWork: "Alcance del trabajo",
  jobPhotos: "Fotos y videos del sitio de trabajo",
  jobPhotosHint: "Agrega hasta 8 fotos o videos. Aparecen en el PDF y en la galería del cliente.",
  saving: "Guardando…",
  materials: "Materiales",
  labor: "Mano de obra",
  item: "Artículo",
  qty: "Cant.",
  unitPrice: "Precio unitario",
  total: "Total",
  task: "Tarea",
  hours: "Horas",
  rate: "Tarifa",
  savingsLine: (a) => `Ahorras ${a} vs. precio de menudeo gracias a los precios mayoristas de Sudden Impact Agency.`,
  tax: (p) => `Impuesto (${p})`,
  timeline: "Cronograma",
  warranty: "Garantía",
  payment: "Pago",
  exclusions: "Exclusiones",
  accepted: "Propuesta aceptada",
  acceptedSub: "Tu contratista ha sido notificado.",
  declined: "Propuesta rechazada",
  declinedSub: "Tu contratista ha sido notificado.",
  acceptThisProposal: "Aceptar esta propuesta",
  selectedTier: (n, a) => `Nivel seleccionado: ${n} — ${a}. Escribe tu nombre completo para firmar electrónicamente.`,
  fullName: "Nombre completo",
  emailOptional: "Correo (opcional)",
  submitting: "Enviando…",
  acceptAndSign: (a) => `Aceptar y firmar — ${a}`,
  decline: "Rechazar",
  confirmDecline: "Confirmar rechazo",
  cancel: "Cancelar",
  declineReasonLabel: "Motivo del rechazo (opcional)",
  declineReasonPh: "ej. elegí otra cotización, no me funcionó el tiempo…",
  sendToClient: "Enviar al cliente",
  sendToClientHint: "Envía esta propuesta directamente a tu cliente. Funciona con cualquier correo — Gmail, Outlook, Yahoo, Apple, correo empresarial o dominio propio.",
  sendBtn: "Enviar propuesta",
  sending: "Enviando…",
  sentTo: (e) => `✓ Enviada a ${e}`,
  loading: "Cargando propuesta…",
  notFound: "Propuesta no encontrada",
  downloadPdf: "Descargar PDF",
};

const fr: Dict = {
  proposal: "Proposition",
  preparedFor: "Préparée pour",
  projectFallback: "Projet",
  tradeProposal: (t) => `Proposition de ${t}`,
  tiers: {
    good: { name: "Essentiel", tagline: "Qualité essentielle, économies intelligentes" },
    better: { name: "Recommandé", tagline: "Recommandé — meilleur rapport qualité-prix" },
    best: { name: "Premium", tagline: "Matériaux et finitions premium" },
  },
  scopeOfWork: "Étendue des travaux",
  jobPhotos: "Photos et vidéos du chantier",
  jobPhotosHint: "Ajoutez jusqu'à 8 photos ou vidéos. Apparaissent sur le PDF et la galerie client.",
  saving: "Enregistrement…",
  materials: "Matériaux",
  labor: "Main-d'œuvre",
  item: "Article",
  qty: "Qté",
  unitPrice: "Prix unitaire",
  total: "Total",
  task: "Tâche",
  hours: "Heures",
  rate: "Taux",
  savingsLine: (a) => `Vous économisez ${a} vs. prix de détail grâce aux prix de gros de Sudden Impact Agency.`,
  tax: (p) => `Taxe (${p})`,
  timeline: "Calendrier",
  warranty: "Garantie",
  payment: "Paiement",
  exclusions: "Exclusions",
  accepted: "Proposition acceptée",
  acceptedSub: "Votre entrepreneur a été notifié.",
  declined: "Proposition refusée",
  declinedSub: "Votre entrepreneur a été notifié.",
  acceptThisProposal: "Accepter cette proposition",
  selectedTier: (n, a) => `Niveau choisi : ${n} — ${a}. Tapez votre nom complet pour signer électroniquement.`,
  fullName: "Nom complet",
  emailOptional: "Courriel (facultatif)",
  submitting: "Envoi…",
  acceptAndSign: (a) => `Accepter et signer — ${a}`,
  decline: "Refuser",
  confirmDecline: "Confirmer le refus",
  cancel: "Annuler",
  declineReasonLabel: "Motif du refus (facultatif)",
  declineReasonPh: "ex. choisi un autre devis, calendrier ne convient pas…",
  sendToClient: "Envoyer au client",
  sendToClientHint: "Envoyez cette proposition directement à votre client. Fonctionne avec toute boîte courriel — Gmail, Outlook, Yahoo, Apple, courriel professionnel ou domaine personnalisé.",
  sendBtn: "Envoyer la proposition",
  sending: "Envoi…",
  sentTo: (e) => `✓ Envoyée à ${e}`,
  loading: "Chargement de la proposition…",
  notFound: "Proposition introuvable",
  downloadPdf: "Télécharger le PDF",
};

const pt: Dict = {
  proposal: "Proposta",
  preparedFor: "Preparada para",
  projectFallback: "Projeto",
  tradeProposal: (t) => `Proposta de ${t}`,
  tiers: {
    good: { name: "Essencial", tagline: "Qualidade essencial, economia inteligente" },
    better: { name: "Recomendado", tagline: "Recomendado — melhor custo-benefício" },
    best: { name: "Premium", tagline: "Materiais e acabamentos premium" },
  },
  scopeOfWork: "Escopo do trabalho",
  jobPhotos: "Fotos e vídeos do local",
  jobPhotosHint: "Adicione até 8 fotos ou vídeos. Aparecem no PDF e na galeria do cliente.",
  saving: "Salvando…",
  materials: "Materiais",
  labor: "Mão de obra",
  item: "Item",
  qty: "Qtd",
  unitPrice: "Preço unitário",
  total: "Total",
  task: "Tarefa",
  hours: "Horas",
  rate: "Taxa",
  savingsLine: (a) => `Você economiza ${a} vs. varejo graças aos preços de atacado da Sudden Impact Agency.`,
  tax: (p) => `Imposto (${p})`,
  timeline: "Cronograma",
  warranty: "Garantia",
  payment: "Pagamento",
  exclusions: "Exclusões",
  accepted: "Proposta aceita",
  acceptedSub: "Seu contratado foi notificado.",
  declined: "Proposta recusada",
  declinedSub: "Seu contratado foi notificado.",
  acceptThisProposal: "Aceitar esta proposta",
  selectedTier: (n, a) => `Nível selecionado: ${n} — ${a}. Digite seu nome completo para assinar eletronicamente.`,
  fullName: "Nome completo",
  emailOptional: "E-mail (opcional)",
  submitting: "Enviando…",
  acceptAndSign: (a) => `Aceitar e assinar — ${a}`,
  decline: "Recusar",
  confirmDecline: "Confirmar recusa",
  cancel: "Cancelar",
  declineReasonLabel: "Motivo da recusa (opcional)",
  declineReasonPh: "ex. escolhi outro orçamento, o prazo não funcionou…",
  sendToClient: "Enviar ao cliente",
  sendToClientHint: "Envie esta proposta diretamente ao seu cliente. Funciona com qualquer caixa de entrada — Gmail, Outlook, Yahoo, Apple, e-mail empresarial ou domínio personalizado.",
  sendBtn: "Enviar proposta",
  sending: "Enviando…",
  sentTo: (e) => `✓ Enviada para ${e}`,
  loading: "Carregando proposta…",
  notFound: "Proposta não encontrada",
  downloadPdf: "Baixar PDF",
};

const ht: Dict = {
  proposal: "Pwopozisyon",
  preparedFor: "Prepare pou",
  projectFallback: "Pwojè",
  tradeProposal: (t) => `Pwopozisyon pou ${t}`,
  tiers: {
    good: { name: "Bon", tagline: "Kalite esansyèl, ekonomi entelijan" },
    better: { name: "Pi Bon", tagline: "Rekòmande — pi bon valè" },
    best: { name: "Premye Klas", tagline: "Materyo ak finisyon premye klas" },
  },
  scopeOfWork: "Travay pou fè",
  jobPhotos: "Foto ak videyo sou plas travay la",
  jobPhotosHint: "Ajoute jiska 8 foto oswa videyo. Yo parèt nan PDF la ak galeri kliyan an.",
  saving: "K ap sove…",
  materials: "Materyo",
  labor: "Men-dèv",
  item: "Atik",
  qty: "Kantite",
  unitPrice: "Pri inite",
  total: "Total",
  task: "Travay",
  hours: "Èdtan",
  rate: "To",
  savingsLine: (a) => `Ou ekonomize ${a} vs. pri detay gras a pri an gwo Sudden Impact Agency.`,
  tax: (p) => `Taks (${p})`,
  timeline: "Orè",
  warranty: "Garanti",
  payment: "Peman",
  exclusions: "Sa ki pa enkli",
  accepted: "Pwopozisyon aksepte",
  acceptedSub: "Kontraktè ou a resevwa nòt la.",
  declined: "Pwopozisyon refize",
  declinedSub: "Kontraktè ou a resevwa nòt la.",
  acceptThisProposal: "Aksepte pwopozisyon sa a",
  selectedTier: (n, a) => `Nivo chwazi: ${n} — ${a}. Tape non konplè ou pou siyen elektwonikman.`,
  fullName: "Non konplè",
  emailOptional: "Imèl (opsyonèl)",
  submitting: "K ap voye…",
  acceptAndSign: (a) => `Aksepte epi siyen — ${a}`,
  decline: "Refize",
  confirmDecline: "Konfime refi",
  cancel: "Anile",
  declineReasonLabel: "Rezon refi (opsyonèl)",
  declineReasonPh: "egz. mwen chwazi yon lòt devi, lè a pa t mache…",
  sendToClient: "Voye bay kliyan",
  sendToClientHint: "Voye pwopozisyon sa a dirèkteman bay kliyan ou. Mache ak nenpòt bwat imèl — Gmail, Outlook, Yahoo, Apple, imèl biznis oswa domèn pèsonalize.",
  sendBtn: "Voye pwopozisyon",
  sending: "K ap voye…",
  sentTo: (e) => `✓ Voye bay ${e}`,
  loading: "K ap chaje pwopozisyon…",
  notFound: "Pwopozisyon pa jwenn",
  downloadPdf: "Telechaje PDF",
};

const DICTS: Record<ProposalLang, Dict> = { en, es, fr, pt, ht };

export function getT(lang: string | undefined | null): Dict {
  const l = (lang || "en").toLowerCase() as ProposalLang;
  return DICTS[l] || en;
}

const LOCALES: Record<ProposalLang, string> = {
  en: "en-US", es: "es-US", fr: "fr-FR", pt: "pt-BR", ht: "ht-HT",
};

export function fmtMoney(n: number, lang: string | undefined | null): string {
  const l = (lang || "en").toLowerCase() as ProposalLang;
  const loc = LOCALES[l] || "en-US";
  try {
    return new Intl.NumberFormat(loc, { style: "currency", currency: "USD" }).format(n || 0);
  } catch {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
  }
}