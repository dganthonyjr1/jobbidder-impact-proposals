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
}: Props) => {
  const isAccept = decision === "accepted";
  const proposalUrl = proposalId ? `${SITE_URL}/p/${proposalId}` : null;

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {isAccept
          ? `${clientName || "Client"} accepted proposal ${proposalNumber}${totalAmount ? ` — ${totalAmount}` : ""}`
          : `${clientName || "Client"} declined proposal ${proposalNumber}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header banner */}
          <Section style={isAccept ? bannerAccept : bannerDecline}>
            <Text style={bannerText}>
              {isAccept ? "🎉 Proposal Accepted" : "❌ Proposal Declined"}
            </Text>
          </Section>

          <Heading style={{ ...h1, color: isAccept ? "#16a34a" : "#dc2626" }}>
            {isAccept ? "You've got a new signed deal!" : "Proposal declined"}
          </Heading>

          <Text style={text}>
            <strong>{clientName || "Your client"}</strong>{" "}
            {isAccept ? "just signed and accepted" : "declined"} proposal{" "}
            <strong>{proposalNumber}</strong>.
          </Text>

          {/* Detail card */}
          <Section style={card}>
            {jobAddress && (
              <Text style={row}>
                <span style={labelStyle}>📍 Job address</span>
                <span style={valueStyle}>{jobAddress}</span>
              </Text>
            )}
            {totalAmount && isAccept && (
              <Text style={row}>
                <span style={labelStyle}>💰 Accepted total</span>
                <span style={{ ...valueStyle, fontWeight: 700, color: "#16a34a", fontSize: "16px" }}>{totalAmount}</span>
              </Text>
            )}
            {selectedTier && isAccept && (
              <Text style={row}>
                <span style={labelStyle}>📋 Tier selected</span>
                <span style={{ ...valueStyle, textTransform: "capitalize" }}>{selectedTier}</span>
              </Text>
            )}
            {signerName && isAccept && (
              <Text style={row}>
                <span style={labelStyle}>✍️ Signed by</span>
                <span style={valueStyle}>{signerName}</span>
              </Text>
            )}
            {declineReason && !isAccept && (
              <Text style={row}>
                <span style={labelStyle}>💬 Reason given</span>
                <span style={valueStyle}>{declineReason || "No reason provided"}</span>
              </Text>
            )}
          </Section>

          {/* CTA button */}
          {proposalUrl && (
            <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
              <Button
                href={proposalUrl}
                style={isAccept ? ctaButtonAccept : ctaButtonDecline}
              >
                {isAccept ? "View Signed Proposal →" : "View Proposal →"}
              </Button>
            </Section>
          )}

          <Text style={text}>
            {isAccept
              ? "🚀 Next step: Call your client to confirm the start date and collect the deposit."
              : "Consider following up with your client — a quick call can often turn a decline into a deal."}
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
  subject: (d: Record<string, any>) =>
    d.decision === "accepted"
      ? `✅ ${d.clientName} accepted proposal ${d.proposalNumber}${d.totalAmount ? ` — ${d.totalAmount}` : ""}`
      : `❌ ${d.clientName} declined proposal ${d.proposalNumber}`,
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
const bannerAccept = {
  backgroundColor: "#16a34a",
  padding: "18px 28px",
};
const bannerDecline = {
  backgroundColor: "#dc2626",
  padding: "18px 28px",
};
const bannerText = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 700,
  margin: "0",
};
const h1 = {
  fontSize: "22px",
  fontWeight: 700,
  margin: "28px 28px 8px",
  padding: "0",
};
const text = {
  fontSize: "14px",
  color: "#334155",
  lineHeight: "1.6",
  margin: "0 28px 16px",
};
const card = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "16px 18px",
  margin: "4px 28px 20px",
};
const row = {
  display: "flex" as const,
  justifyContent: "space-between" as const,
  fontSize: "13px",
  color: "#475569",
  margin: "8px 0",
};
const labelStyle = { color: "#64748b" };
const valueStyle = { color: "#0f172a", fontWeight: 500 as const };
const ctaButtonAccept = {
  backgroundColor: "#16a34a",
  color: "#ffffff",
  padding: "14px 32px",
  borderRadius: "8px",
  fontWeight: 700,
  fontSize: "15px",
  textDecoration: "none",
  display: "inline-block" as const,
};
const ctaButtonDecline = {
  backgroundColor: "#475569",
  color: "#ffffff",
  padding: "14px 32px",
  borderRadius: "8px",
  fontWeight: 700,
  fontSize: "15px",
  textDecoration: "none",
  display: "inline-block" as const,
};
const hr = { borderColor: "#e2e8f0", margin: "28px 28px 16px" };
const footer = { fontSize: "12px", color: "#94a3b8", margin: "0 28px" };
