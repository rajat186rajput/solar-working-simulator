"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const MISCONCEPTIONS = [
  {
    id: "m1",
    trigger: "On-grid mein bijli kate toh bhi solar se ghar chalega",
    reality:
      "On-grid inverter mein anti-islanding relay hoti hai — grid fail hone par inverter milliseconds mein band ho jata hai. Solar panels chhat par hain aur dhoop bhi hai, par system completely offline. Ye lineman ki suraksha ke liye mandatory hai.",
    demo: "Scenario 1 try karo — 2 PM sunny, grid fail karke dekho.",
  },
  {
    id: "m2",
    trigger: "Lead-acid battery sahi hai, sasti bhi hai",
    reality:
      "Lead-acid sirf 50% use ho sakti hai (DoD 50%) jabki LiFePO4 90% tak. 10 kWh rated lead-acid mein sirf 3.24 kWh usable, LiFePO4 mein 8.55 kWh. Plus lead-acid 3-4 saal mein replace karna padta hai vs LiFePO4 ke 12-15 saal.",
    demo: "Battery section mein Lead-acid vs LiFePO4 switch karke backup hours compare karo.",
  },
  {
    id: "m3",
    trigger: "Cloudy din mein solar bilkul kaam nahin karta",
    reality:
      "Cloudy din mein 40% generation hoti hai. Baarish mein bhi 15% milti hai. Zero sirf raat mein hota hai jab suraj nahin hota. 4.4 kWp system cloudy din ke 12 PM par bhi 1,672 W generate karta hai.",
    demo: "Time slider 12 PM rakho, Cloudy Day select karo — solar generation dekho.",
  },
  {
    id: "m4",
    trigger: "Hybrid mein battery hogi toh unlimited bijli milegi",
    reality:
      "Battery ek paani ki tanki hai — bhar jaati hai aur khaali bhi hoti hai. Inverter ka size bhi ek limit hai. Durasol 6.2 kW inverter par 2 AC + geyser + EV = 8,755 W — INVERTER TRIP. Kuch bhi ek saath nahi chalta.",
    demo: "Scenario 5 try karo — EV + 2 AC + Geyser ek saath.",
  },
  {
    id: "m5",
    trigger: "Solar lagao aur bijli ka bill zero",
    reality:
      "Hybrid + net meter se saal bhar ka bill near-zero ho sakta hai, lekin cloudy monsoon mein grid import hoga. Raat mein battery se chalega. EV raat mein charge karni ho toh grid se. Smart load management zaroori hai.",
    demo: "Scenario 3 try karo — cloudy din, full house load.",
  },
  {
    id: "m6",
    trigger: "Battery full ho jaaye toh solar panels chhut jayenge, urja waste",
    reality:
      "On-Grid aur Hybrid mein battery full hone par surplus grid ko export hoti hai — bijli ka unit bank mein jaata hai, waste nahi hoti. Sirf Off-Grid mein panels clip hote hain kyunki export ka koi rasta nahi.",
    demo: "Scenario 4 try karo — battery full, sunny midday.",
  },
  {
    id: "m7",
    trigger: "Raat mein bhi solar panel se bijli milti hai — roshni se bhi banta hai",
    reality:
      "Solar panel sirf direct sunlight se kaam karta hai. Moonlight ya room ki artificial light se negligible generation hoti hai (0.01% se bhi kam). Raat ko 100% battery ya grid se bijli aati hai.",
    demo: "Time slider 10 PM ya 12 AM tak le jaao — solar = 0 W.",
  },
];

export function MisconceptionAccordion() {
  return (
    <div className="space-y-2">
      <h3 className="text-xl font-semibold text-text-primary font-display mb-4">
        7 Common Misconceptions — Busted Live
      </h3>
      <Accordion className="space-y-2">
        {MISCONCEPTIONS.map((item) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className="rounded-xl border border-surface-stroke bg-surface-card px-4 data-[state=open]:border-warning/40"
          >
            <AccordionTrigger className="text-left text-sm font-medium text-warning hover:no-underline py-3">
              <span className="line-through decoration-warning/50 mr-2 text-warning/70">
                Myth:
              </span>
              {item.trigger}
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-2">
              <div className="text-sm text-text-primary leading-relaxed">
                {item.reality}
              </div>
              <div className="text-xs text-solar border border-solar/20 bg-solar/5 rounded-lg px-3 py-2">
                Demo: {item.demo}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
