import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { GuideBody } from "@/components/GuideContent";

export const Route = createFileRoute("/_authenticated/guide")({
  head: () => ({ meta: [{ title: "Guide — Jobbidder" }] }),
  component: GuidePage,
});

function GuidePage() {
  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Guide</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Everything Jobbidder does, step by step — what each feature is, how it works, and why it's built this way.
      </p>
      <GuideBody />
    </div>
  );
}
