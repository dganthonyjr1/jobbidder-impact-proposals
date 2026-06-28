import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  decision: "accepted" | "declined";
  businessName?: string;
  clientName?: string;
  proposalNumber?: string;
  proposalId?: string | null;
  jobAddress?: string | null;
  totalAmount?: string | null;
  signerName?: string | null;
  declineReason?: string | null;
  selectedTier?: string | null;
  language?: string;
}

type DecisionStrings = {
  preview: (n: string, num: string, amt?: string | null) => string;
  previewDecline: (n: string, num: string) => string;
  bannerAccept: string;
  bannerDecline: string;
  headingAccept: string;
  headingDecline: string;
  bodyAccept: (n: string, num: string) => string;
  bodyDecline: (n: string, num: string) => string;
  labelAddress: string;
  labelTotal: string;
  labelTier: string;
  labelSigned: string;
  labelReason: string;
  ctaAccept: string;
  ctaDecline: string;
  nextStepAccept: string;
  nextStepDecline: string;
};

const STRINGS: Record<string, DecisionStrings> = {
  en: {
    preview: (n, num, amt) => `${n} accepted proposal ${num}${amt ? ` — ${amt}` : ""}`,
    previewDecline: (n, num) => `${n} declined proposal ${num}`,
    bannerAccept: "🎉 Proposal Accepted",
    bannerDecline: "❌ Proposal Declined",
    headingAccept: "You've got a new signed deal!",
    headingDecline: "Proposal declined",
    bodyAccept: (n, num) => `${n} just signed and accepted proposal ${num}.`,
    bodyDecline: (n, num) => `${n} declined proposal ${num}.`,
    labelAddress: "📍 Job address",
    labelTotal: "💰 Accepted total",
    labelTier: "📋 Tier selected",
    labelSigned: "✍️ Signed by",
    labelReason: "💬 Reason given",
    ctaAccept: "View Signed Proposal →",
    ctaDecline: "View Proposal →",
    nextStepAccept: "🚀 Next step: Call your client to confirm the start date and collect the deposit.",
    nextStepDecline: "Consider following up with your client — a quick call can often turn a decline into a deal.",
  },
  es: {
    preview: (n, num, amt) => `${n} aceptó la propuesta ${num}${amt ? ` — ${amt}` : ""}`,
    previewDecline: (n, num) => `${n} rechazó la propuesta ${num}`,
    bannerAccept: "🎉 Propuesta Aceptada",
    bannerDecline: "❌ Propuesta Rechazada",
    headingAccept: "¡Tienes un nuevo trato firmado!",
    headingDecline: "Propuesta rechazada",
    bodyAccept: (n, num) => `${n} acaba de firmar y aceptar la propuesta ${num}.`,
    bodyDecline: (n, num) => `${n} rechazó la propuesta ${num}.`,
    labelAddress: "📍 Dirección del trabajo",
    labelTotal: "💰 Total aceptado",
    labelTier: "📋 Nivel seleccionado",
    labelSigned: "✍️ Firmado por",
    labelReason: "💬 Razón indicada",
    ctaAccept: "Ver propuesta firmada →",
    ctaDecline: "Ver propuesta →",
    nextStepAccept: "🚀 Próximo paso: Llama a tu cliente para confirmar la fecha de inicio y cobrar el depósito.",
    nextStepDecline: "Considera dar seguimiento a tu cliente — una llamada rápida puede convertir un rechazo en un trato.",
  },
  fr: {
    preview: (n, num, amt) => `${n} a accepté la proposition ${num}${amt ? ` — ${amt}` : ""}`,
    previewDecline: (n, num) => `${n} a refusé la proposition ${num}`,
    bannerAccept: "🎉 Proposition Acceptée",
    bannerDecline: "❌ Proposition Refusée",
    headingAccept: "Vous avez un nouveau contrat signé !",
    headingDecline: "Proposition refusée",
    bodyAccept: (n, num) => `${n} vient de signer et d'accepter la proposition ${num}.`,
    bodyDecline: (n, num) => `${n} a refusé la proposition ${num}.`,
    labelAddress: "📍 Adresse du chantier",
    labelTotal: "💰 Total accepté",
    labelTier: "📋 Niveau sélectionné",
    labelSigned: "✍️ Signé par",
    labelReason: "💬 Raison indiquée",
    ctaAccept: "Voir la proposition signée →",
    ctaDecline: "Voir la proposition →",
    nextStepAccept: "🚀 Prochaine étape : Appelez votre client pour confirmer la date de début et encaisser l'acompte.",
    nextStepDecline: "Envisagez de relancer votre client — un appel rapide peut souvent transformer un refus en accord.",
  },
  pt: {
    preview: (n, num, amt) => `${n} aceitou a proposta ${num}${amt ? ` — ${amt}` : ""}`,
    previewDecline: (n, num) => `${n} recusou a proposta ${num}`,
    bannerAccept: "🎉 Proposta Aceita",
    bannerDecline: "❌ Proposta Recusada",
    headingAccept: "Você tem um novo contrato assinado!",
    headingDecline: "Proposta recusada",
    bodyAccept: (n, num) => `${n} acabou de assinar e aceitar a proposta ${num}.`,
    bodyDecline: (n, num) => `${n} recusou a proposta ${num}.`,
    labelAddress: "📍 Endereço do serviço",
    labelTotal: "💰 Total aceito",
    labelTier: "📋 Nível selecionado",
    labelSigned: "✍️ Assinado por",
    labelReason: "💬 Motivo indicado",
    ctaAccept: "Ver proposta assinada →",
    ctaDecline: "Ver proposta →",
    nextStepAccept: "🚀 Próxima etapa: Ligue para seu cliente para confirmar a data de início e cobrar o depósito.",
    nextStepDecline: "Considere entrar em contato com seu cliente — uma ligação rápida pode transformar uma recusa em negócio.",
  },
  ht: {
    preview: (n, num, amt) => `${n} aksepte pwopozisyon ${num}${amt ? ` — ${amt}` : ""}`,
    previewDecline: (n, num) => `${n} refize pwopozisyon ${num}`,
    bannerAccept: "🎉 Pwopozisyon Aksepte",
    bannerDecline: "❌ Pwopozisyon Refize",
    headingAccept: "Ou gen yon nouvo kontra siyen!",
    headingDecline: "Pwopozisyon refize",
    bodyAccept: (n, num) => `${n} fenk siyen epi aksepte pwopozisyon ${num}.`,
    bodyDecline: (n, num) => `${n} refize pwopozisyon ${num}.`,
    labelAddress: "📍 Adrès travay la",
    labelTotal: "💰 Total aksepte",
    labelTier: "📋 Nivo chwazi",
    labelSigned: "✍️ Siyen pa",
    labelReason: "💬 Rezon bay",
    ctaAccept: "Wè pwopozisyon siyen →",
    ctaDecline: "Wè pwopozisyon →",
    nextStepAccept: "🚀 Pwochen etap: Rele kliyan ou pou konfime dat kòmansman an epi kolekte depozit la.",
    nextStepDecline: "Konsidere swiv kliyan ou — yon apèl rapid ka souvan chanje yon refize an yon deal.",
  },
};

function getS(language?: string): DecisionStrings {
  const lang = (language || "en").toLowerCase().slice(0, 2);
  return STRINGS[lang] || STRINGS.en;
}

const SITE_URL = "https://www.jobbidder.io";

const ProposalDecisionEmail = ({
  decision,
  clientName,
  proposalNumber,
  proposalId,
  jobAddress,
  totalAmount,
  signerName,
  declineReason,
  selectedTier,
  language,
}: Props) => {
  const isAccept = decision === "accepted";
  const proposalUrl = proposalId ? `${SITE_URL}/p/${proposalId}` : null;
  const s = getS(language);
  const htmlLang = (language || "en").toLowerCase().slice(0, 2);
  const client = clientName || "Client";
  const num = proposalNumber || "";

  return (
    <Html lang={htmlLang} dir="ltr">
      <Head />
      <Preview>
        {isAccept ? s.preview(client, num, totalAmount) : s.previewDecline(client, num)}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={isAccept ? bannerAccept : bannerDecline}>
            <Text style={bannerText}>
              {isAccept ? s.bannerAccept : s.bannerDecline}
            </Text>
          </Section>

          <Heading style={{ ...h1, color: isAccept ? "#16a34a" : "#dc2626" }}>
            {isAccept ? s.headingAccept : s.headingDecline}
          </Heading>

          <Text style={text}>
            <strong>{client}</strong>{" "}
            {isAccept ? s.bodyAccept(client, num).replace(client + " ", "") : s.bodyDecline(client, num).replace(client + " ", "")}
          </Text>

          <Section style={card}>
            {jobAddress && (
              <Text style={row}>
                <span style={labelStyle}>{s.labelAddress}</span>
                <span style={valueStyle}>{jobAddress}</span>
              </Text>
            )}
            {totalAmount && isAccept && (
              <Text style={row}>
                <span style={labelStyle}>{s.labelTotal}</span>
                <span style={{ ...valueStyle, fontWeight: 700, color: "#16a34a", fontSize: "16px" }}>{totalAmount}</span>
              </Text>
            )}
            {selectedTier && isAccept && (
              <Text style={row}>
                <span style={labelStyle}>{s.labelTier}</span>
                <span style={{ ...valueStyle, textTransform: "capitalize" }}>{selectedTier}</span>
              </Text>
            )}
            {signerName && isAccept && (
              <Text style={row}>
                <span style={labelStyle}>{s.labelSigned}</span>
                <span style={valueStyle}>{signerName}</span>
              </Text>
            )}
            {declineReason && !isAccept && (
              <Text style={row}>
                <span style={labelStyle}>{s.labelReason}</span>
                <span style={valueStyle}>{declineReason || "—"}</span>
              </Text>
            )}
          </Section>

          {proposalUrl && (
            <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
              <Button href={proposalUrl} style={isAccept ? ctaButtonAccept : ctaButtonDecline}>
                {isAccept ? s.ctaAccept : s.ctaDecline}
              </Button>
            </Section>
          )}

          <Text style={text}>
            {isAccept ? s.nextStepAccept : s.nextStepDecline}
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Jobbidder · Powered by{" "}
            <a href="https://suddenimpactagency.io" style={{ color: "#94a3b8" }}>
              Sudden Impact Agency
            </a>{" "}
            · automatic notification
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: ProposalDecisionEmail,
  subject: (d: Record<string, any>) => {
    const s = getS(d.language);
    const n = d.clientName || "Client";
    const num = d.proposalNumber || "";
    return d.decision === "accepted"
      ? `✅ ${s.preview(n, num, d.totalAmount)}`
      : `❌ ${s.previewDecline(n, num)}`;
  },
  displayName: "Proposal decision",
  previewData: {
    decision: "accepted",
    businessName: "Mike's Roofing LLC",
    clientName: "John Davis",
    proposalNumber: "SIA-2606-1234",
    proposalId: "1f6d2986-05e2-4358-9d0d-7595d0a4b851",
    jobAddress: "123 Ocean Ave, Wildwood, NJ 08260",
    totalAmount: "$14,500.00",
    signerName: "John Davis",
    selectedTier: "better",
    language: "en",
  },
} satisfies TemplateEntry;

// Styles
const main = { backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" };
const container = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "0 0 32px",
  maxWidth: "560px",
  margin: "32px auto",
  border: "1px solid #e2e8f0",
  overflow: "hidden" as const,
};
const bannerAccept = { backgroundColor: "#16a34a", padding: "18px 28px" };
const bannerDecline = { backgroundColor: "#dc2626", padding: "18px 28px" };
const bannerText = { color: "#ffffff", fontSize: "16px", fontWeight: 700, margin: "0" };
const h1 = { fontSize: "22px", fontWeight: 700, margin: "28px 28px 8px", padding: "0" };
const text = { fontSize: "14px", color: "#334155", lineHeight: "1.6", margin: "0 28px 16px" };
const card = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "16px 18px",
  margin: "4px 28px 20px",
};
const row = { display: "flex" as const, justifyContent: "space-between" as const, fontSize: "13px", color: "#475569", margin: "8px 0" };
const labelStyle = { color: "#64748b" };
const valueStyle = { color: "#0f172a", fontWeight: 500 as const };
const ctaButtonAccept = {
  backgroundColor: "#16a34a", color: "#ffffff", padding: "14px 32px",
  borderRadius: "8px", fontWeight: 700, fontSize: "15px", textDecoration: "none", display: "inline-block" as const,
};
const ctaButtonDecline = {
  backgroundColor: "#475569", color: "#ffffff", padding: "14px 32px",
  borderRadius: "8px", fontWeight: 700, fontSize: "15px", textDecoration: "none", display: "inline-block" as const,
};
const hr = { borderColor: "#e2e8f0", margin: "28px 28px 16px" };
const footer = { fontSize: "12px", color: "#94a3b8", margin: "0 28px" };
