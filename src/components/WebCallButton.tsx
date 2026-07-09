import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

const GHL_JESSICA_AGENT_ID = "6a2c5bd995517e66beaeb3d9";
const BACKEND_URL = "/api/public/create-web-call";

export function WebCallButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleStart() {
    setIsLoading(true);
    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: GHL_JESSICA_AGENT_ID,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Backend error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error("No web call URL received from backend");
      }

      // Open the GHL web call in a new window or modal
      const webCallWindow = window.open(data.url, "ghl-web-call", "width=800,height=600");
      if (!webCallWindow) {
        toast.error("Could not open web call window. Please check your browser settings.");
      } else {
        toast.success("Opening Jessica web call...");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to connect";
      toast.error(errorMsg);
      console.error("[WebCall] Error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      size="lg"
      onClick={handleStart}
      disabled={isLoading}
      className="shadow-glow"
    >
      <Mic className="mr-2 h-4 w-4" />
      {isLoading ? "Connecting..." : "Talk to AI Proposal Agent"}
    </Button>
  );
}
