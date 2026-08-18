// GATE-1/GATE-2 UI polish — automated overlap/overflow regression check.
//
// Collects bounding boxes (in viewport/screen space, via getBoundingClientRect
// — comparable across SVG <text>, <g>, <rect>, and HTML foreignObject content
// regardless of the SVG's internal viewBox scaling) for:
//   - every <text> element inside the schematic <svg>              ("text boxes")
//   - every [data-flow-label="true"] group (the 6 flow-watt-label
//     pills), tagged with its own data-flow-type                   ("flow-label boxes")
//   - every [data-node-card="true"] rect (each ComponentNode's own
//     card boundary)                                               ("card boxes")
//   - every [data-node-foreignobject="true"] div (the HTML content
//     embedded inside each node via <foreignObject>)               ("foreignobject boxes")
//   - every path.power-flow-path, SAMPLED every ~4 viewBox units
//     along its length via getPointAtLength + getScreenCTM (GATE-2
//     round-3 (b) below)                                           ("flow sample points")
//
// and asserts:
//   (a) no two text/label boxes intersect each other
//   (b) no flow-label box intersects any card box (flow labels live in the
//       gaps between nodes — they must never touch a node they don't belong to)
//   (c) no foreignobject's content overflows its allotted card space
//       (scrollHeight <= clientHeight, the exact "text overflows below the
//       card" class of bug reported by Rajat)
//   (d) GATE-2 round-3 — no flow-PATH sample point lies inside any text box,
//       node-foreignobject box, or a DIFFERENT flow's label pill (a path
//       crossing its OWN label pill is expected/fine — everything else is
//       the exact "flow line runs through card text" class of bug Rajat
//       found in round 3, which (a)/(b) alone did not catch since they only
//       checked the label PILL's rect, never the path geometry itself)
//   (e)/(f) GATE-1 sidebar polish — ModeSidebar's PCU-mode chip list (the
//       Lead-reported bug: "GRID EXPORT" wrapping onto/under the Lock icon,
//       SMART's "Factory default" badge overlapping the Day/Night chain
//       rows). For every combo where the sidebar is opened, ALL leaf
//       text-bearing elements and ALL <svg> icon elements inside
//       [data-testid="mode-sidebar-panel"] are collected separately from
//       the schematic SVG's own geometry (the sidebar visually occludes the
//       diagram behind it — comparing sidebar text against diagram text
//       would be a false positive, not a real defect) and asserted:
//   (e) no two sidebar text boxes intersect each other
//   (f) no sidebar text box intersects a sidebar icon box (this is the
//       actual class of bug reported — an absolutely-positioned Lock icon
//       sitting on top of wrapped chip-label text)
//
// Run at 1440 / 1024 / 768 / 375 px, in both Learn and Real Setup, in both
// EN and HI (16 base combinations) PLUS the sidebar-open variant of Real
// Setup at every width where the sidebar toggle handle is reachable (>=768,
// `hidden md:flex` on the handle) in both languages (6 more) — 22
// combinations total. Report saved to
// Projects/Personal/3 Solar Working Simulator/preview_screenshots/v15d_overlap_report.txt

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.OVERLAP_CHECK_BASE_URL || "http://localhost:3000";
const REPORT_PATH =
  process.env.OVERLAP_CHECK_REPORT_PATH ||
  "C:\\Users\\Rajat Home Office\\OneDrive - Exponiq Engineering Services Pvt. Ltd\\Obsidian\\Projects\\Personal\\3 Solar Working Simulator\\preview_screenshots\\v15d_overlap_report.txt";

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
    if (!svg) {
      return { textBoxes: [], flowLabelBoxes: [], cardBoxes: [], foreignObjects: [], flowSamplePoints: [] };
    }

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

    const flowLabelBoxes = Array.from(svg.querySelectorAll('[data-flow-label="true"]')).map((el, i) => ({
      ...toBox(el, `flow-label#${i}`),
      flowType: el.getAttribute("data-flow-type") || null,
    }));

    const cardBoxes = Array.from(svg.querySelectorAll('[data-node-card="true"]')).map((el, i) =>
      toBox(el, `node-card#${i}`)
    );

    const foreignObjects = Array.from(svg.querySelectorAll('[data-node-foreignobject="true"]')).map((el, i) => {
      const r = el.getBoundingClientRect();
      return {
        label: `foreignobject#${i}`,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
      };
    });

    // GATE-2 round-3 (b) — sample every flow <path> every ~4 viewBox units
    // along its length, convert each local point to viewport/screen space
    // via getScreenCTM (accounts for the SVG's viewBox→viewport scale, no
    // extra group transforms sit between these paths and the <svg> itself).
    const flowSamplePoints = [];
    // Only ACTIVE (solid, visible) paths — an inactive dashed 0.15-opacity
    // line (e.g. the currently-not-flowing direction of a bidirectional
    // pair, always present in the DOM) crossing text is not a real defect.
    const flowPaths = Array.from(svg.querySelectorAll('path.power-flow-path[data-flow-active="true"]'));
    for (const p of flowPaths) {
      const flowType = p.getAttribute("data-flow-type") || null;
      let len = 0;
      try {
        len = p.getTotalLength();
      } catch {
        continue;
      }
      if (!len) continue;
      const ctm = p.getScreenCTM();
      if (!ctm) continue;
      const STEP = 4;
      for (let d = 0; d <= len; d += STEP) {
        const local = p.getPointAtLength(d);
        const screen = local.matrixTransform(ctm);
        flowSamplePoints.push({ x: screen.x, y: screen.y, flowType });
      }
    }

    return { textBoxes, flowLabelBoxes, cardBoxes, foreignObjects, flowSamplePoints };
  });
}

function pointInBox(pt, box) {
  return pt.x >= box.left && pt.x <= box.right && pt.y >= box.top && pt.y <= box.bottom;
}

// (e)/(f) — ModeSidebar's own geometry, collected separately from the
// schematic SVG (see the header comment above for why: the sidebar
// occludes the diagram, so cross-comparing the two would be noise, not
// signal). "Text boxes" = leaf elements (no element children) that carry
// non-empty text content — the same "atomic unit" idea as picking <text>
// elements out of the SVG, just for HTML. "Icon boxes" = every <svg> (the
// lucide-react icons: Lock, and PriorityChain's Sun/BatteryCharging/Zap/
// ArrowRight) inside the panel.
async function collectSidebarGeometry(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-testid="mode-sidebar-panel"]');
    if (!panel) return { textBoxes: [], iconBoxes: [] };

    const toBox = (el, label) => {
      const r = el.getBoundingClientRect();
      return { label, left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
    };

    const textBoxes = Array.from(panel.querySelectorAll("*"))
      .filter((el) => el.children.length === 0 && (el.textContent || "").trim().length > 0)
      .map((el, i) => toBox(el, `sidebar-text#${i} "${(el.textContent || "").trim().slice(0, 30)}"`))
      .filter((b) => b.w > 0 && b.h > 0);

    const iconBoxes = Array.from(panel.querySelectorAll("svg"))
      .map((el, i) => toBox(el, `sidebar-icon#${i}`))
      .filter((b) => b.w > 0 && b.h > 0);

    return { textBoxes, iconBoxes };
  });
}

async function runCombo(browser, width, mode, lang, sidebarOpen = false) {
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

    if (sidebarOpen) {
      // ModeSidebar auto-opens once (desktop, first real-setup entry) then
      // auto-closes ~4s later — click deterministically into the OPEN state
      // regardless of that transient timer (the click itself also cancels
      // any pending auto-close, per ModeSidebar's handleToggle()).
      const handle = page.getByRole("button", { name: /Open simulation mode panel|Close simulation mode panel/i }).first();
      await handle.click();
      await page.waitForTimeout(300);
      const expanded = await handle.getAttribute("aria-expanded");
      if (expanded !== "true") {
        await handle.click();
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(300); // let the 220ms slide-in settle
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

    // (d) GATE-2 round-3 — flow-PATH geometry (not just its label pill) vs
    // text/foreignobject/other-flow's-label boxes. This is the check that
    // catches "the line runs through the card text" — (a)/(b) above only
    // ever compared the label PILL's rect, never sampled the path itself.
    // (dedupe: a path running through one text box produces many consecutive
    // hits — collapse to one reported violation per path×box pair, but still
    // count every sample toward checksRun.)
    const reportedPathHits = new Set();
    for (const pt of geo.flowSamplePoints) {
      checksRun++;
      let hit = null;

      for (const t of freeTextBoxes) {
        if (pointInBox(pt, t)) { hit = t; break; }
      }
      if (!hit) {
        for (const f of geo.flowLabelBoxes) {
          // A path crossing its OWN watt-label pill is expected (the pill
          // sits directly on the path by design) — only a DIFFERENT flow's
          // pill counts as a violation.
          if (f.flowType && f.flowType === pt.flowType) continue;
          if (pointInBox(pt, f)) { hit = f; break; }
        }
      }
      if (!hit) {
        for (const fo of geo.foreignObjects) {
          if (pointInBox(pt, fo)) { hit = fo; break; }
        }
      }

      if (hit) {
        const key = `${pt.flowType}::${hit.label}`;
        if (!reportedPathHits.has(key)) {
          reportedPathHits.add(key);
          violations.push(
            `(d) FLOW-PATH THROUGH TEXT — path[data-flow-type="${pt.flowType}"] point (${pt.x.toFixed(1)},${pt.y.toFixed(1)})  inside  ${hit.label} ${fmtRect(hit)}`
          );
        }
      }
    }

    // (e)/(f) — sidebar-open combos only. See collectSidebarGeometry() and
    // the header comment for why this is checked separately from the SVG's
    // own geometry rather than merged into (a).
    if (sidebarOpen) {
      const sidebarGeo = await collectSidebarGeometry(page);

      for (let i = 0; i < sidebarGeo.textBoxes.length; i++) {
        for (let j = i + 1; j < sidebarGeo.textBoxes.length; j++) {
          checksRun++;
          const a = sidebarGeo.textBoxes[i];
          const b = sidebarGeo.textBoxes[j];
          if (rectsIntersect(a, b)) {
            violations.push(`(e) SIDEBAR TEXT OVERLAP — ${a.label} ${fmtRect(a)}  <->  ${b.label} ${fmtRect(b)}`);
          }
        }
      }

      for (const t of sidebarGeo.textBoxes) {
        for (const icon of sidebarGeo.iconBoxes) {
          checksRun++;
          if (rectsIntersect(t, icon)) {
            violations.push(`(f) SIDEBAR TEXT ON ICON — ${t.label} ${fmtRect(t)}  <->  ${icon.label} ${fmtRect(icon)}`);
          }
        }
      }
    }
  } catch (err) {
    violations.push(`(!) RUN ERROR — ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await page.close();
  }

  return { width, mode, lang, sidebarOpen, checksRun, violations };
}

// ModeSidebar's toggle handle is `hidden md:flex` (Tailwind md = 768px) —
// the sidebar-open variant is only reachable at these widths.
const SIDEBAR_CAPABLE_WIDTHS = WIDTHS.filter((w) => w >= 768);

async function main() {
  const browser = await chromium.launch();
  const results = [];

  for (const width of WIDTHS) {
    for (const mode of MODES) {
      for (const lang of LANGS) {
        const r = await runCombo(browser, width, mode, lang);
        results.push(r);
        console.log(
          `${String(width).padStart(4)}px | ${mode.padEnd(10)} | ${lang} | sidebar=closed | ${r.checksRun} checks | ${
            r.violations.length
          } violation(s)`
        );
      }
    }
  }

  // GATE-1 sidebar polish — Real Setup, sidebar OPEN, at every width where
  // the toggle handle exists (>=768px), both languages.
  for (const width of SIDEBAR_CAPABLE_WIDTHS) {
    for (const lang of LANGS) {
      const r = await runCombo(browser, width, "real-setup", lang, true);
      results.push(r);
      console.log(
        `${String(width).padStart(4)}px | ${"real-setup".padEnd(10)} | ${lang} | sidebar=open   | ${r.checksRun} checks | ${
          r.violations.length
        } violation(s)`
      );
    }
  }

  await browser.close();

  const totalChecks = results.reduce((s, r) => s + r.checksRun, 0);
  const totalViolations = results.reduce((s, r) => s + r.violations.length, 0);

  const lines = [];
  lines.push("Solar Working Simulator — GATE-1 overlap-check report");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(
    `Combinations: ${results.length} (widths ${WIDTHS.join("/")}px x modes ${MODES.join("/")} x langs ${LANGS.join(
      "/"
    )}, plus sidebar=open on Real Setup at widths ${SIDEBAR_CAPABLE_WIDTHS.join("/")}px x langs ${LANGS.join("/")})`
  );
  lines.push(`Total checks run: ${totalChecks}`);
  lines.push(`Total violations: ${totalViolations}`);
  lines.push("");
  for (const r of results) {
    const sidebarTag = r.sidebarOpen ? " / sidebar=open" : "";
    lines.push(`── ${r.width}px / ${r.mode} / ${r.lang}${sidebarTag} — ${r.checksRun} checks, ${r.violations.length} violation(s) ──`);
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
