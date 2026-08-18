// GATE-1 UI polish — automated overlap/overflow regression check.
//
// Collects bounding boxes (in viewport/screen space, via getBoundingClientRect
// — comparable across SVG <text>, <g>, <rect>, and HTML foreignObject content
// regardless of the SVG's internal viewBox scaling) for:
//   - every <text> element inside the schematic <svg>              ("text boxes")
//   - every [data-flow-label="true"] group (the 6 flow-watt-label
//     pills + the Ghar "Tap hint" pill)                            ("flow-label boxes")
//   - every [data-node-card="true"] rect (each ComponentNode's own
//     card boundary)                                               ("card boxes")
//   - every [data-node-foreignobject="true"] div (the HTML content
//     embedded inside each node via <foreignObject>)               ("foreignobject boxes")
//
// and asserts:
//   (a) no two text/label boxes intersect each other
//   (b) no flow-label box intersects any card box (flow labels live in the
//       gaps between nodes — they must never touch a node they don't belong to)
//   (c) no foreignobject's content overflows its allotted card space
//       (scrollHeight <= clientHeight, the exact "text overflows below the
//       card" class of bug reported by Rajat)
//
// Run at 1440 / 1024 / 768 / 375 px, in both Learn and Real Setup, in both
// EN and HI — 16 combinations total. Report saved to
// Projects/Personal/3 Solar Working Simulator/preview_screenshots/v15c_overlap_report.txt

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.OVERLAP_CHECK_BASE_URL || "http://localhost:3000";
const REPORT_PATH =
  process.env.OVERLAP_CHECK_REPORT_PATH ||
  "C:\\Users\\Rajat Home Office\\OneDrive - Exponiq Engineering Services Pvt. Ltd\\Obsidian\\Projects\\Personal\\3 Solar Working Simulator\\preview_screenshots\\v15c_overlap_report.txt";

const WIDTHS = [1440, 1024, 768, 375];
const MODES = ["learn", "real-setup"];
const LANGS = ["en", "hi"];
const EPS = 0.5; // px tolerance for float/subpixel jitter — real overlaps are always > a few px

function rectsIntersect(a, b) {
  return (
    a.left < b.right - EPS &&
    a.right > b.left + EPS &&
    a.top < b.bottom - EPS &&
    a.bottom > b.top + EPS
  );
}

function fmtRect(r) {
  return `[${r.left.toFixed(1)},${r.top.toFixed(1)} → ${r.right.toFixed(1)},${r.bottom.toFixed(1)}]`;
}

async function collectGeometry(page) {
  return page.evaluate(() => {
    const svg = document.querySelector('svg[role="img"]');
    if (!svg) return { textBoxes: [], flowLabelBoxes: [], cardBoxes: [], foreignObjects: [] };

    const toBox = (el, label) => {
      const r = el.getBoundingClientRect();
      return {
        label,
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        w: r.width,
        h: r.height,
      };
    };

    const textBoxes = Array.from(svg.querySelectorAll("text"))
      .map((el, i) => toBox(el, `text#${i} "${(el.textContent || "").trim().slice(0, 30)}"`))
      // Zero-size text (e.g. empty tspans, not-yet-laid-out) isn't a real box.
      .filter((b) => b.w > 0 && b.h > 0);

    const flowLabelBoxes = Array.from(svg.querySelectorAll('[data-flow-label="true"]')).map(
      (el, i) => toBox(el, `flow-label#${i}`)
    );

    const cardBoxes = Array.from(svg.querySelectorAll('[data-node-card="true"]')).map((el, i) =>
      toBox(el, `node-card#${i}`)
    );

    const foreignObjects = Array.from(svg.querySelectorAll('[data-node-foreignobject="true"]')).map(
      (el, i) => ({
        label: `foreignobject#${i}`,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      })
    );

    return { textBoxes, flowLabelBoxes, cardBoxes, foreignObjects };
  });
}

async function runCombo(browser, width, mode, lang) {
  const page = await browser.newPage({ viewport: { width, height: Math.max(900, Math.round(width * 0.65)) } });
  const violations = [];
  let checksRun = 0;

  try {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);

    if (mode === "real-setup") {
      await page.getByRole("button", { name: /Real Setup/i }).first().click();
      await page.waitForTimeout(800);
    }
    if (lang === "hi") {
      await page.getByRole("button", { name: /Switch to Hindi/i }).click();
      await page.waitForTimeout(500);
    }

    const geo = await collectGeometry(page);

    // (a) text/label box vs text/label box — union of text boxes + flow-label
    // group boxes (a flow-label group's own <text> child is already inside
    // its group box, so we compare GROUPS against OTHER GROUPS and against
    // free-standing text boxes that don't belong to a flow-label group; to
    // avoid double-counting we drop any text box whose center falls inside a
    // flow-label box, since that's the label's own text, not a separate box).
    const isInsideAnyFlowLabel = (t) => {
      const cx = (t.left + t.right) / 2;
      const cy = (t.top + t.bottom) / 2;
      return geo.flowLabelBoxes.some((f) => cx >= f.left && cx <= f.right && cy >= f.top && cy <= f.bottom);
    };
    const freeTextBoxes = geo.textBoxes.filter((t) => !isInsideAnyFlowLabel(t));
    const allLabelBoxes = [...freeTextBoxes, ...geo.flowLabelBoxes];

    for (let i = 0; i < allLabelBoxes.length; i++) {
      for (let j = i + 1; j < allLabelBoxes.length; j++) {
        checksRun++;
        const a = allLabelBoxes[i];
        const b = allLabelBoxes[j];
        if (rectsIntersect(a, b)) {
          violations.push(
            `(a) TEXT/LABEL OVERLAP — ${a.label} ${fmtRect(a)}  <->  ${b.label} ${fmtRect(b)}`
          );
        }
      }
    }

    // (b) flow-label box vs node-card box — must never intersect.
    for (const f of geo.flowLabelBoxes) {
      for (const c of geo.cardBoxes) {
        checksRun++;
        if (rectsIntersect(f, c)) {
          violations.push(`(b) FLOW-LABEL ON CARD — ${f.label} ${fmtRect(f)}  <->  ${c.label} ${fmtRect(c)}`);
        }
      }
    }

    // (c) foreignObject content overflow.
    for (const fo of geo.foreignObjects) {
      checksRun++;
      if (fo.scrollHeight > fo.clientHeight + 1) {
        violations.push(
          `(c) FOREIGNOBJECT OVERFLOW — ${fo.label} scrollHeight=${fo.scrollHeight} > clientHeight=${fo.clientHeight}`
        );
      }
    }
  } catch (err) {
    violations.push(`(!) RUN ERROR — ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await page.close();
  }

  return { width, mode, lang, checksRun, violations };
}

async function main() {
  const browser = await chromium.launch();
  const results = [];

  for (const width of WIDTHS) {
    for (const mode of MODES) {
      for (const lang of LANGS) {
        const r = await runCombo(browser, width, mode, lang);
        results.push(r);
        console.log(
          `${String(width).padStart(4)}px | ${mode.padEnd(10)} | ${lang} | ${r.checksRun} checks | ${
            r.violations.length
          } violation(s)`
        );
      }
    }
  }

  await browser.close();

  const totalChecks = results.reduce((s, r) => s + r.checksRun, 0);
  const totalViolations = results.reduce((s, r) => s + r.violations.length, 0);

  const lines = [];
  lines.push("Solar Working Simulator — GATE-1 overlap-check report");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Combinations: ${results.length} (widths ${WIDTHS.join("/")}px x modes ${MODES.join("/")} x langs ${LANGS.join("/")})`);
  lines.push(`Total checks run: ${totalChecks}`);
  lines.push(`Total violations: ${totalViolations}`);
  lines.push("");
  for (const r of results) {
    lines.push(`── ${r.width}px / ${r.mode} / ${r.lang} — ${r.checksRun} checks, ${r.violations.length} violation(s) ──`);
    if (r.violations.length === 0) {
      lines.push("  (clean)");
    } else {
      for (const v of r.violations) lines.push(`  ${v}`);
    }
    lines.push("");
  }

  writeFileSync(REPORT_PATH, lines.join("\n"), "utf-8");
  console.log(`\nReport saved: ${REPORT_PATH}`);
  console.log(`TOTAL: ${totalChecks} checks, ${totalViolations} violations`);

  if (totalViolations > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
