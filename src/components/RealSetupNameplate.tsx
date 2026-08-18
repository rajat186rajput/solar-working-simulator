"use client";

// System Nameplate panel (Section E) — collapsible, technical specs only,
// no cost/account/serial data (03_ASBUILT.md §5 "out of scope").

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSimStore } from "@/store/simulation-store";
import { L } from "@/lib/i18n";
import { NAMEPLATE } from "@/lib/realSetup";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-surface-stroke/40 last:border-b-0">
      <span className="text-[10px] text-text-secondary uppercase tracking-wide">{label}</span>
      <span className="font-mono text-[11px] sm:text-xs text-text-primary tabular-nums text-right">{value}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wide text-solar mt-2 mb-0.5 first:mt-0">
      {children}
    </div>
  );
}

export function RealSetupNameplate({ className = "" }: { className?: string }) {
  const lang = useSimStore((s) => s.lang);

  return (
    <Accordion className={className}>
      <AccordionItem
        value="nameplate"
        className="rounded-xl border border-surface-stroke bg-surface-card/60 px-3"
      >
        <AccordionTrigger className="text-xs font-semibold text-text-primary hover:no-underline py-2.5">
          {L(lang, "nameplateTitle")}
        </AccordionTrigger>
        <AccordionContent className="pb-3 space-y-1">
          <SectionHeading>
            {L(lang, "nameplateModule")} — {NAMEPLATE.module.name} (× {NAMEPLATE.module.countPerConnection} / connection)
          </SectionHeading>
          <Row label={L(lang, "nameplateArraySize")} value={`${NAMEPLATE.module.arrayKwp} kWp`} />
          <Row label={L(lang, "nameplateStcPmax")} value={NAMEPLATE.module.stcPmax} />
          <Row label={L(lang, "nameplateVocIsc")} value={NAMEPLATE.module.vocIsc} />
          <Row label={L(lang, "nameplateVmpImp")} value={NAMEPLATE.module.vmpImp} />
          <Row label={L(lang, "nameplateType")} value={NAMEPLATE.module.type} />

          <SectionHeading>
            {L(lang, "nameplatePCU")} — {NAMEPLATE.pcu.name}
          </SectionHeading>
          <Row label={L(lang, "nameplateBatteryModeCap")} value={NAMEPLATE.pcu.batteryModeCap} />
          <Row label={L(lang, "nameplateMainsRating")} value={NAMEPLATE.pcu.mainsRating} />
          <Row label={L(lang, "nameplateSpvCurrent")} value={NAMEPLATE.pcu.spvChargeCurrent} />
          <Row label={L(lang, "nameplateEfficiency")} value={NAMEPLATE.pcu.efficiency} />

          <SectionHeading>
            {L(lang, "nameplateBattery")} — {NAMEPLATE.battery.name}
          </SectionHeading>
          <Row label={L(lang, "nameplateBank")} value={NAMEPLATE.battery.bank} />
          <Row label={L(lang, "nameplateUsable")} value={NAMEPLATE.battery.usable} />
          <Row label={L(lang, "nameplateLowCut")} value={NAMEPLATE.battery.lowCut} />

          <div className="text-[10px] text-text-muted mt-2 leading-relaxed">
            {L(lang, "nameplateFootnote")}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
