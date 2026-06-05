import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DEFAULT_GHL_AGENT_NUMBER = "+13109874997";

function formatDisplayNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return phone;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

export function VoiceCallButton() {
  const agentNumber =
    import.meta.env.VITE_GHL_AGENT_NUMBER?.trim() || DEFAULT_GHL_AGENT_NUMBER;

  function handleStart() {
    if (!agentNumber) {
      toast.error("GHL voice agent number is not configured.");
      return;
    }
    window.location.href = `tel:${agentNumber}`;
  }

  return (
    <Button size="lg" onClick={handleStart} className="shadow-glow">
      <Phone className="mr-2 h-4 w-4" />
      Call AI Proposal Agent: {formatDisplayNumber(agentNumber)}
    </Button>
  );
}
