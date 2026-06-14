import { Document, Page, Text, View, StyleSheet, Image, Link } from "@react-pdf/renderer";
import { computeTotals, fmt, TIER_LABELS, type MaterialLine, type LaborLine } from "@/lib/pricing";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2 solid #111", paddingBottom: 12, marginBottom: 16 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 40, height: 40, objectFit: "contain" },
  brandName: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  brandMeta: { fontSize: 9, color: "#555", marginTop: 2 },
  proposalBox: { alignItems: "flex-end" },
  proposalLabel: { fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 1 },
  proposalNumber: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  proposalDate: { fontSize: 9, color: "#555", marginTop: 4 },
  expiry: { fontSize: 9, color: "#b8000a", marginTop: 2, fontFamily: "Helvetica-Bold" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  preparedFor: { fontSize: 9, color: "#555", marginBottom: 2 },
  clientName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  address: { fontSize: 10, color: "#333", marginTop: 1 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6, paddingBottom: 4, borderBottom: "1 solid #ddd" },
  body: { fontSize: 10, lineHeight: 1.45, color: "#222" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f3f3", paddingVertical: 4, paddingHorizontal: 6, fontFamily: "Helvetica-Bold", fontSize: 9, textTransform: "uppercase", color: "#555" },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottom: "0.5 solid #eee" },
  colItem: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  lineTitle: { fontSize: 10 },
  lineDesc: { fontSize: 8.5, color: "#666", marginTop: 1 },
  totalsBox: { marginTop: 14, padding: 12, backgroundColor: "#f8f8f8", borderRadius: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalLabel: { color: "#555" },
  grandRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 6, borderTop: "1 solid #ccc" },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  infoGrid: { flexDirection: "row", gap: 10, marginTop: 12 },
  infoCard: { flex: 1, padding: 8, border: "1 solid #ddd", borderRadius: 3 },
  infoLabel: { fontSize: 8, color: "#777", textTransform: "uppercase", marginBottom: 2 },
  infoValue: { fontSize: 10 },
  exclusionItem: { fontSize: 9, color: "#444", marginBottom: 2 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  photo: { width: 160, height: 120, objectFit: "cover", borderRadius: 3, border: "1 solid #ddd" },
  videoLink: { fontSize: 9, color: "#0f62fe", marginTop: 4 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, fontSize: 8, color: "#888", textAlign: "center", borderTop: "0.5 solid #ddd", paddingTop: 6 },
});

type Props = {
  proposal: any;
  contractor: any;
  tier: "good" | "better" | "best";
};

export function ProposalPdf({ proposal, contractor, tier }: Props) {
  const materials = (proposal.materials || []) as MaterialLine[];
  const labor = (proposal.labor || []) as LaborLine[];
  const totals = computeTotals(materials, labor, tier, Number(proposal.tax_rate) || 0.07);
  const created = proposal.created_at ? new Date(proposal.created_at) : new Date();
  const expires = proposal.expires_at
    ? new Date(proposal.expires_at)
    : new Date(created.getTime() + 72 * 60 * 60 * 1000);
  const mediaUrls: string[] = Array.isArray(proposal.photos) ? proposal.photos : [];
  const isVideoUrl = (url: string) => /\.(mp4|mov|webm)(\?|#|$)/i.test(url);
  const photos = mediaUrls.filter((url) => !isVideoUrl(url));
  const videos = mediaUrls.filter((url) => isVideoUrl(url));

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            {contractor?.logo_url ? <Image src={contractor.logo_url} style={styles.logo} /> : null}
            <View>
              <Text style={styles.brandName}>{contractor?.business_name || "Contractor"}</Text>
              <Text style={styles.brandMeta}>
                {[contractor?.phone, contractor?.email].filter(Boolean).join("  ·  ")}
              </Text>
              {contractor?.license_number ? (
                <Text style={styles.brandMeta}>License #{contractor.license_number}</Text>
              ) : null}
              {contractor?.business_address ? (
                <Text style={styles.brandMeta}>{contractor.business_address}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.proposalBox}>
            <Text style={styles.proposalLabel}>Proposal</Text>
            <Text style={styles.proposalNumber}>{proposal.proposal_number}</Text>
            <Text style={styles.proposalDate}>Issued {created.toLocaleDateString()}</Text>
            <Text style={styles.expiry}>Expires {expires.toLocaleString()}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.preparedFor}>Prepared for</Text>
          <Text style={styles.clientName}>{proposal.client_name}</Text>
          {proposal.job_address ? <Text style={styles.address}>{proposal.job_address}</Text> : null}
          <Text style={[styles.h1, { marginTop: 14 }]}>
            {(proposal.trade_type || "Project")} Proposal — {TIER_LABELS[tier]?.name || "Better"}
          </Text>
        </View>

        {proposal.scope_of_work ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scope of Work</Text>
            <Text style={styles.body}>{proposal.scope_of_work}</Text>
          </View>
        ) : null}

        {mediaUrls.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job-site Media</Text>
            {photos.length > 0 ? (
              <View style={styles.photoGrid}>
                {photos.slice(0, 6).map((url, i) => (
                  <Image key={i} src={url} style={styles.photo} />
                ))}
              </View>
            ) : null}
            {videos.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                {videos.map((url, i) => (
                  <Text key={url} style={styles.videoLink}>
                    Video {i + 1}: <Link src={url}>{url}</Link>
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {materials.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Materials</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.colItem}>Item</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colUnit}>Unit price</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>
            {materials.map((m, i) => {
              const unit = (m.sia_price ?? m.retail_price) || 0;
              return (
                <View key={i} style={styles.tableRow}>
                  <View style={styles.colItem}>
                    <Text style={styles.lineTitle}>{m.item}</Text>
                    {m.description ? <Text style={styles.lineDesc}>{m.description}</Text> : null}
                  </View>
                  <Text style={styles.colQty}>{m.qty} {m.unit}</Text>
                  <Text style={styles.colUnit}>{fmt(unit)}</Text>
                  <Text style={styles.colTotal}>{fmt(unit * m.qty)}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {labor.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Labor</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.colItem}>Task</Text>
              <Text style={styles.colQty}>Hours</Text>
              <Text style={styles.colUnit}>Rate</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>
            {labor.map((l, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={styles.colItem}>
                  <Text style={styles.lineTitle}>{l.task}</Text>
                  {l.description ? <Text style={styles.lineDesc}>{l.description}</Text> : null}
                </View>
                <Text style={styles.colQty}>{l.hours}</Text>
                <Text style={styles.colUnit}>{fmt(l.rate)}</Text>
                <Text style={styles.colTotal}>{fmt(l.hours * l.rate)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.totalsBox} wrap={false}>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Materials</Text><Text>{fmt(totals.materialsSia)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Labor</Text><Text>{fmt(totals.laborTotal)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Tax</Text><Text>{fmt(totals.tax)}</Text></View>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{fmt(totals.grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.infoGrid} wrap={false}>
          {proposal.timeline ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Timeline</Text>
              <Text style={styles.infoValue}>{proposal.timeline}</Text>
            </View>
          ) : null}
          {proposal.warranty ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Warranty</Text>
              <Text style={styles.infoValue}>{proposal.warranty}</Text>
            </View>
          ) : null}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Payment terms</Text>
            <Text style={styles.infoValue}>{proposal.payment_terms || "50% deposit, 50% on completion"}</Text>
          </View>
        </View>

        {Array.isArray(proposal.exclusions) && proposal.exclusions.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Exclusions</Text>
            {proposal.exclusions.map((e: string, i: number) => (
              <Text key={i} style={styles.exclusionItem}>• {e}</Text>
            ))}
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          {contractor?.business_name || "Contractor"} · Proposal {proposal.proposal_number} · Expires {expires.toLocaleDateString()} · Powered by Jobbidder
        </Text>
      </Page>
    </Document>
  );
}