import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const RETELL_AGENT_ID = "6a2c5bd995517e66beaeb3d9";
const BACKEND_URL = "/api/public/create-web-call";

export function WebCallButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);

  async function handleStart() {
    if (isCallActive) {
      toast.info("Call already in progress");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: RETELL_AGENT_ID,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Backend error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.access_token) {
        throw new Error("No access token received from backend");
      }

      // Dynamically import and initialize Retell SDK
      const { RetellWebClient } = await import("retell-client-js-sdk");
      const client = new RetellWebClient();

      client.on("call_started", () => {
        setIsCallActive(true);
        toast.success("Connected to Jessica");
      });

      client.on("call_ended", () => {
        setIsCallActive(false);
        toast.info("Call ended");
      });

      client.on("error", (err) => {
        setIsCallActive(false);
        toast.error(`Call error: ${err.message}`);
      });

      await client.startCall({ accessToken: data.access_token });
    } catch (error) {
      setIsCallActive(false);
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
