"use client";

import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Claim } from "@/lib/demo-data";

export function ClaimCard({ claim }: { claim: Claim }) {
  const correct = claim.verdict !== null && claim.verdict === claim.truth;
  const wrong = claim.verdict !== null && claim.verdict !== claim.truth;

  return (
    <div
      className={cn(
        "w-full rounded-xl border bg-card px-4 py-3 text-sm shadow-sm transition-colors",
        correct && "border-emerald-500/40 bg-emerald-500/5",
        wrong && "border-rose-500/40 bg-rose-500/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="leading-snug text-card-foreground">{claim.text}</p>
        {correct && (
          <Check className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
        )}
        {wrong && <X className="h-4 w-4 shrink-0 text-rose-500" aria-hidden />}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <Badge variant={claim.truth ? "default" : "secondary"}>
          truth: {claim.truth ? "TRUE" : "FALSE"}
        </Badge>
        {claim.verdict !== null && (
          <Badge
            variant="outline"
            className={cn(
              correct && "border-emerald-500/40 text-emerald-600",
              wrong && "border-rose-500/40 text-rose-600",
            )}
          >
            verdict: {claim.verdict ? "TRUE" : "FALSE"}
          </Badge>
        )}
      </div>
    </div>
  );
}
