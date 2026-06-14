import * as React from "react";
import {
  Body,
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
  jobAddress?: string | null;
  totalAmount?: string | null;
  signerName?: string | null;
  declineReason?: string | null;
  selectedTier?: string | null;
}

const ProposalDecisionEmail = ({
  decision,
  clientName,
  proposalNumber,
  jobAddress,
  totalAmount,
  signerName,
  declineReason,
  selectedTier,
}: Props) => {
  const isAccept = decision === "accepted";
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {isAccept
          ? `${clientName || "Client"} accepted proposal ${proposalNumber}`
          : `${clientName || "Client"} declined proposal ${proposalNumber}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={{ ...h1, color: isAccept ? "#16a34a" : "#dc2626" }}>
            {isAccept ? "🎉 Proposal accepted!" : "Proposal declined"}
          </Heading>
          <Text style={text}>
            <strong>{clientName}</strong>{" "}
            {isAccept ? "just accepted" : "declined"} proposal{" "}
            <strong>{proposalNumber}</strong>.
          </Text>

          <Section style={card}>
            {jobAddress && (
              <Text style={row}>
                <span style={label}>Job</span>
                <span style={value}>{jobAddress}</span>
              </Text>
            )}
            {totalAmount && (
              <Text style={row}>
                <span style={label}>Total</span>
                <span style={{ ...value, fontWeight: 700 }}>{totalAmount}</span>
              </Text>
            )}
            {selectedTier && isAccept && (
              <Text style={row}>
                <span style={label}>Tier</span>
                <span style={value}>{selectedTier}</span>
              </Text>
            )}
            {signerName && isAccept && (
              <Text style={row}>
                <span style={label}>Signed by</span>
                <span style={value}>{signerName}</span>
              </Text>
            )}
            {declineReason && !isAccept && (
              <Text style={row}>
                <span style={label}>Reason</span>
                <span style={value}>{declineReason}</span>
              </Text>
            )}
          </Section>

          <Text style={text}>
            {isAccept
              ? "Call your client to schedule the work and collect the deposit."
              : "Consider following up to ask if there's anything you can adjust."}
          </Text>

          <Hr style={hr} />
          <Text style={footer}>Jobbidder · automatic notification</Text>
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
    proposalNumber: "BP-1234",
    jobAddress: "123 Ocean Ave, Wildwood, NJ",
    totalAmount: "$14,500.00",
    signerName: "John Davis",
    selectedTier: "better",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px" };
const h1 = { fontSize: "22px", fontWeight: 700, margin: "0 0 16px" };
const text = { fontSize: "14px", color: "#334155", lineHeight: "1.6", margin: "0 0 16px" };
const card = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "16px 18px",
  margin: "20px 0",
};
const row = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "13px",
  color: "#475569",
  margin: "6px 0",
};
const label = { color: "#64748b" };
const value = { color: "#0f172a", fontWeight: 500 as const };
const hr = { borderColor: "#e2e8f0", margin: "28px 0 16px" };
const footer = { fontSize: "12px", color: "#94a3b8", margin: "0" };