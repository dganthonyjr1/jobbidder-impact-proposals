import * as React from 'react'
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
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface ProposalReadyProps {
  clientName?: string
  businessName?: string
  proposalNumber?: string
  jobAddress?: string
  tradeType?: string
  totalAmount?: string
  proposalUrl?: string
  language?: string
}

type LangStrings = {
  preview: (b: string) => string
  greeting: (n: string) => string
  bodyVerb: string
  proposalLabel: string
  addressLabel: string
  totalLabel: string
  ctaButton: string
  tiersInfo: string
  footerPrefix: string
  footerSuffix: string
}

const STRINGS: Record<string, LangStrings> = {
  en: {
    preview: (b) => `${b} sent you a proposal`,
    greeting: (n) => `Hi ${n},`,
    bodyVerb: 'has prepared a detailed proposal for your review.',
    proposalLabel: 'Proposal #',
    addressLabel: 'Job address',
    totalLabel: 'Estimated total',
    ctaButton: 'View your proposal',
    tiersInfo: 'The proposal includes three tier options (Good, Better, Best) so you can choose what fits your needs and budget. You can e-sign directly from the page when you\'re ready to move forward.',
    footerPrefix: 'Questions? Just reply to this email and ',
    footerSuffix: ' will get back to you.',
  },
  es: {
    preview: (b) => `${b} te envió una propuesta`,
    greeting: (n) => `Hola ${n},`,
    bodyVerb: 'ha preparado una propuesta detallada para tu revisión.',
    proposalLabel: 'Propuesta #',
    addressLabel: 'Dirección del trabajo',
    totalLabel: 'Total estimado',
    ctaButton: 'Ver tu propuesta',
    tiersInfo: 'La propuesta incluye tres opciones (Básico, Mejor, Premium) para que elijas la que mejor se adapte a tus necesidades y presupuesto. Puedes firmar electrónicamente directamente desde la página cuando estés listo.',
    footerPrefix: '¿Preguntas? Solo responde este correo y ',
    footerSuffix: ' te contestará.',
  },
  fr: {
    preview: (b) => `${b} vous a envoyé une proposition`,
    greeting: (n) => `Bonjour ${n},`,
    bodyVerb: 'a préparé une proposition détaillée pour votre examen.',
    proposalLabel: 'Proposition #',
    addressLabel: 'Adresse du chantier',
    totalLabel: 'Total estimé',
    ctaButton: 'Voir votre proposition',
    tiersInfo: 'La proposition comprend trois niveaux (Essentiel, Recommandé, Premium) pour que vous puissiez choisir ce qui correspond à vos besoins et à votre budget. Vous pouvez signer électroniquement directement depuis la page.',
    footerPrefix: 'Des questions ? Répondez simplement à cet e-mail et ',
    footerSuffix: ' vous répondra.',
  },
  pt: {
    preview: (b) => `${b} enviou uma proposta para você`,
    greeting: (n) => `Olá ${n},`,
    bodyVerb: 'preparou uma proposta detalhada para sua análise.',
    proposalLabel: 'Proposta #',
    addressLabel: 'Endereço do serviço',
    totalLabel: 'Total estimado',
    ctaButton: 'Ver sua proposta',
    tiersInfo: 'A proposta inclui três opções (Essencial, Recomendado, Premium) para você escolher o que melhor se adapta às suas necessidades e orçamento. Você pode assinar eletronicamente diretamente na página.',
    footerPrefix: 'Dúvidas? Responda este e-mail e ',
    footerSuffix: ' entrará em contato.',
  },
  ht: {
    preview: (b) => `${b} voye yon pwopozisyon pou ou`,
    greeting: (n) => `Bonjou ${n},`,
    bodyVerb: 'prepare yon pwopozisyon detaye pou ou revize.',
    proposalLabel: 'Pwopozisyon #',
    addressLabel: 'Adrès travay la',
    totalLabel: 'Total estimé',
    ctaButton: 'Wè pwopozisyon ou an',
    tiersInfo: 'Pwopozisyon an gen twa nivo (Bon, Pi Bon, Premye Klas) pou ou ka chwazi sa ki pi bon pou bezwen ak bidjè ou. Ou ka siyen elektwonikman dirèkteman sou paj la.',
    footerPrefix: 'Kesyon? Reponn imèl sa a epi ',
    footerSuffix: ' ap kontakte ou.',
  },
}

function getS(language?: string): LangStrings {
  const lang = (language || 'en').toLowerCase()
  return STRINGS[lang] || STRINGS.en
}

const ProposalReadyEmail = ({
  clientName,
  businessName,
  proposalNumber,
  jobAddress,
  tradeType,
  totalAmount,
  proposalUrl,
  language,
}: ProposalReadyProps) => {
  const s = getS(language)
  const business = businessName || 'Your contractor'
  const htmlLang = (language || 'en').toLowerCase()

  return (
    <Html lang={htmlLang} dir="ltr">
      <Head />
      <Preview>{s.preview(business)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {clientName ? s.greeting(clientName) : s.greeting('there')}
          </Heading>
          <Text style={text}>
            <strong>{business}</strong>{' '}{s.bodyVerb}
          </Text>

          <Section style={card}>
            {proposalNumber && (
              <Text style={cardRow}>
                <span style={cardLabel}>{s.proposalLabel}</span>
                <span style={cardValue}>{proposalNumber}</span>
              </Text>
            )}
            {jobAddress && (
              <Text style={cardRow}>
                <span style={cardLabel}>{s.addressLabel}</span>
                <span style={cardValue}>{jobAddress}</span>
              </Text>
            )}
            {totalAmount && (
              <Text style={cardRow}>
                <span style={cardLabel}>{s.totalLabel}</span>
                <span style={{ ...cardValue, fontWeight: 700 }}>{totalAmount}</span>
              </Text>
            )}
          </Section>

          {proposalUrl && (
            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button href={proposalUrl} style={button}>
                {s.ctaButton}
              </Button>
            </Section>
          )}

          <Text style={text}>{s.tiersInfo}</Text>

          <Hr style={hr} />
          <Text style={footer}>
            {s.footerPrefix}{business}{s.footerSuffix}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProposalReadyEmail,
  subject: (data: Record<string, any>) => {
    const s = getS(data.language)
    const b = data.businessName || ''
    const n = data.proposalNumber || ''
    return b ? `${b} ${s.preview(b).replace(b + ' ', '')}${n ? ` (${n})` : ''}` : s.preview('Your contractor')
  },
  displayName: 'Proposal ready',
  previewData: {
    clientName: 'Jane',
    businessName: 'Sudden Impact Agency',
    proposalNumber: 'SIA-1234-5678',
    jobAddress: '245 Oak Street, Cape May, NJ',
    tradeType: 'Flooring',
    totalAmount: '$8,420.00',
    proposalUrl: 'https://example.com/p/demo',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const card = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px 18px',
  margin: '20px 0',
}
const cardRow = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
  color: '#475569',
  margin: '6px 0',
}
const cardLabel = { color: '#64748b' }
const cardValue = { color: '#0f172a', fontWeight: 500 as const }
const button = {
  backgroundColor: '#EC4899',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e2e8f0', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '0' }
