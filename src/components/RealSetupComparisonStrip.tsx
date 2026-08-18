"use client";

// B — desktop-only (≥1280px) comparison strip: shows the non-active
// connection's Load W + Battery % so a peek doesn't require switching.
// Adapted placement note (see developer Change Summary): the design spec
// pins this "directly under the Stats Bar" — that StatsBar/TopStrip component
// exists in the repo but is NOT mounted in the live app (dead code, same
// pattern flagged for the sibling *SetupCard files in the project registry).
// This strip is pinned directly under the TopBar/ticker instead, which is
// the equivalent always-visible position in the actual live chrome.

import { useSimStore } from "@/store/simulation-store";
import { L } from "@/lib/i18n";
import { otherConnection } from "@/lib/realSetup";

export function RealSetupComparisonStrip() {
  const simView = useSimStore((s) => s.simView);
  const activeConnection = useSimStore((s) => s.activeConnection);
  const otherConnectionSummary = useSimStore((s) => s.otherConnectionSummary);
  const setActiveConnection = useSimStore((s) => s.setActiveConnection);
  const lang = useSimStore((s) => s.lang);

  if (simView !== "real-setup") return null;

  const otherId = otherConnection(activeConnection);
  const titleKey = otherId === "connection-1" ? "connection1Title" : "connection2Title";

  return (
    <button
      onClick={() => setActiveConnection(otherId)}
      className="hidden xl:flex w-full items-center gap-2 px-4 h-7 shrink-0 border-b border-surface-stroke/40 bg-surface-card/40 text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-card/70 transition-colors text-left"
      aria-label={`Switch to ${L(lang, titleKey)}`}
    >
      <span>{L(lang, "otherConnectionLbl")}</span>
      <span className="font-mono tabular-nums text-text-primary">
        {L(lang, titleKey)} — {Math.round(otherConnectionSummary.loadW)}W · {Math.round(otherConnectionSummary.batterySoc * 100)}%
      </span>
    </button>
  );
}
