#!/usr/bin/env node
/**
 * RTL gate for the Playground.
 *
 * PMP ships Arabic and Hebrew. A physical CSS property (`ml-4`, `text-left`,
 * `left-0`) does not mirror, so it silently produces a broken layout in two of
 * three shipped locales — and nobody notices, because the people reviewing the
 * PR are reading it in English.
 *
 * A script rather than an eslint rule because the target is the CONTENT of
 * className strings, which eslint reasons about poorly. Run in CI or by hand.
 *
 * The canvas is the deliberate exception: its viewport is pinned `dir="ltr"`
 * because a spatial coordinate system must not mirror — two people in the same
 * meeting would otherwise see the same note in different places. Files opt out
 * with an explicit marker comment, so the exemption is visible where it applies
 * rather than buried in this list.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TARGET = join(ROOT, "src/components/playground");
const OPT_OUT = "rtl-exempt";

const FORBIDDEN = [
  [/\bflex-row\b/, "flex-row is reversed globally by rtl.css; use the default flex direction"],
  [/\bml-auto\b/, "use ms-auto"],
  [/\bmr-auto\b/, "use me-auto"],
  [/\btext-left\b/, "use text-start"],
  [/\btext-right\b/, "use text-end"],
  [/\bp[lr]-\d/, "use ps-* / pe-*"],
  [/\bm[lr]-\d/, "use ms-* / me-*"],
  [/\b(left|right)-\d/, "use start-* / end-*"],
  [/\bborder-[lr]\b/, "use border-s / border-e"],
  [/\brounded-[lr]-/, "use rounded-s-* / rounded-e-*"],
];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory()
      ? walk(full)
      : /\.tsx?$/.test(entry)
        ? [full]
        : [];
  });
}

let failures = 0;

for (const file of walk(TARGET)) {
  const source = readFileSync(file, "utf8");
  if (source.includes(OPT_OUT)) continue;

  source.split("\n").forEach((line, index) => {
    // Comments describe the rule as often as they break it — this very file's
    // documentation names the classes it forbids.
    const trimmed = line.trim();
    if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
      return;
    }
    const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
    if (!code.trim()) return;
    // `rtl:` variants are an explicit, correct override.
    if (code.includes("rtl:")) return;

    for (const [pattern, fix] of FORBIDDEN) {
      if (pattern.test(code)) {
        console.error(
          `${relative(ROOT, file)}:${index + 1}  ${pattern.source}  —  ${fix}`
        );
        failures += 1;
        break;
      }
    }
  });
}

if (failures > 0) {
  console.error(`\n${failures} physical propert${failures === 1 ? "y" : "ies"} found. PMP ships ar and he; these will not mirror.`);
  process.exit(1);
}
console.log("RTL gate passed — no physical properties in src/components/playground");
