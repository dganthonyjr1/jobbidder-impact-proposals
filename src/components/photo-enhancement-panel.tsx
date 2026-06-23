import { useState } from "react";
import { Wand2, Zap, Tag, FileText, Maximize2, Trash2, Palette, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface EnhancementOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  providers: string[];
  recommended: string;
  cost: string;
}

interface PhotoEnhancementPanelProps {
  mediaId: string;
  imageUrl: string;
  onEnhancementStart?: (type: string) => void;
  onEnhancementComplete?: (result: any) => void;
}

const ENHANCEMENT_OPTIONS: EnhancementOption[] = [
  {
    id: "damage-assessment",
    name: "Damage Assessment",
    description: "AI analyzes damage type, severity, and repair recommendations",
    icon: <Zap className="h-5 w-5" />,
    providers: ["claude"],
    recommended: "claude",
    cost: "$0.003",
  },
  {
    id: "auto-describe",
    name: "Auto Description",
    description: "Generate detailed description of the photo",
    icon: <FileText className="h-5 w-5" />,
    providers: ["openai"],
    recommended: "openai",
    cost: "$0.01",
  },
  {
    id: "auto-tag",
    name: "Auto Tags",
    description: "Automatically generate relevant tags for the photo",
    icon: <Tag className="h-5 w-5" />,
    providers: ["claude"],
    recommended: "claude",
    cost: "$0.003",
  },
  {
    id: "upscale",
    name: "Upscale (4x)",
    description: "Enhance resolution and clarity (4x upscaling)",
    icon: <Maximize2 className="h-5 w-5" />,
    providers: ["replicate"],
    recommended: "replicate",
    cost: "$0.001",
  },
  {
    id: "background-removal",
    name: "Remove Background",
    description: "Remove background and isolate subject",
    icon: <Trash2 className="h-5 w-5" />,
    providers: ["replicate"],
    recommended: "replicate",
    cost: "$0.001",
  },
  {
    id: "color-correction",
    name: "Enhance Colors",
    description: "Improve brightness, contrast, and color accuracy",
    icon: <Palette className="h-5 w-5" />,
    providers: ["replicate"],
    recommended: "replicate",
    cost: "$0.001",
  },
];

export function PhotoEnhancementPanel({
  mediaId,
  imageUrl,
  onEnhancementStart,
  onEnhancementComplete,
}: PhotoEnhancementPanelProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const handleEnhance = async (
    enhancementId: string,
    provider: string
  ) => {
    setProcessing(enhancementId);
    onEnhancementStart?.(enhancementId);

    try {
      const response = await fetch("/api/media/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId,
          enhancementType: enhancementId,
          provider,
        }),
      });

      if (!response.ok) throw new Error("Enhancement request failed");

      const result = await response.json();
      setCompleted((prev) => new Set([...prev, enhancementId]));
      toast.success(`${enhancementId} completed`);
      onEnhancementComplete?.(result);
    } catch (error) {
      toast.error(
        `Enhancement failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">AI Photo Enhancements</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ENHANCEMENT_OPTIONS.map((option) => (
          <div
            key={option.id}
            className="rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-2">
                <div className="text-primary mt-0.5">{option.icon}</div>
                <div>
                  <h4 className="font-medium text-sm">{option.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
              {completed.has(option.id) && (
                <Badge className="bg-green-500/20 text-green-300">✓</Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {option.providers.map((provider) => (
                  <Badge
                    key={provider}
                    variant={
                      provider === option.recommended ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {provider}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {option.cost}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEnhance(option.id, option.recommended)}
                  disabled={processing === option.id || completed.has(option.id)}
                  className="h-7 px-2"
                >
                  {processing === option.id ? (
                    <>
                      <Loader className="h-3 w-3 animate-spin mr-1" />
                      Processing...
                    </>
                  ) : completed.has(option.id) ? (
                    "Done"
                  ) : (
                    "Enhance"
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
        <p className="text-xs text-blue-300">
          <strong>Note:</strong> Enhancements are processed asynchronously. Results will appear in your media library. Processing typically takes 30 seconds to 2 minutes depending on the enhancement type.
        </p>
      </div>
    </div>
  );
}
