import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { getT } from "@/lib/proposal-i18n";
import { toast } from "sonner";

type Props = {
  proposal: any;
  contractor: any;
  tier: "good" | "better" | "best";
};

export function DownloadPdfButton({ proposal, contractor, tier }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const [{ pdf }, { ProposalPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ProposalPdf"),
      ]);
      const blob = await pdf(<ProposalPdf proposal={proposal} contractor={contractor} tier={tier} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${proposal.proposal_number || "proposal"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Could not generate PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" className="print:hidden" onClick={handleDownload} disabled={loading}>
      <Download className="h-3.5 w-3.5 mr-1.5" />
      {loading ? "…" : getT((proposal as any)?.language).downloadPdf}
    </Button>
  );
}