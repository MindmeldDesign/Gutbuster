// npm run tokens
//
// Generates src/app/tokens.css from design/tokens.json, a copy of the
// Gutbuster DS Figma library's three variable collections:
//
//   Brand   base values: color ramps, spacing scale, font families/weights
//   Alias   type slots (font, weight, size, line height), in px and rem
//   Mapped  role names (background, text, selected, ...) pointing at Brand
//
// The CSS mirrors that structure: role variables point at base variables,
// exactly as in Figma, so changing a role in Figma and re-syncing changes
// every component that uses it. Tailwind utilities are generated for all
// of it, e.g. bg-gb-yellow-200, text-gb-text, border-gb-selected,
// text-body, text-shelf.
//
// Spacing needs no utilities of its own: the library's scale/N steps are
// Tailwind's default spacing (scale/100 = 4px = p-1, scale/400 = 16px =
// p-4, scale/50 = 2px = p-0.5), so p-*, gap-*, m-* already use library
// values. --gb-scale-N variables are still generated for hand-written CSS.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(root, "design", "tokens.json"), "utf8"));
const { Brand, Alias, Mapped } = tokens.collections;

// Figma name -> CSS variable name
//   colors/gb-yellow/500 -> --gb-yellow-500
//   foundations/white    -> --gb-foundation-white
//   scale/400            -> --gb-scale-400
//   background (Mapped)  -> --gb-background
const cssName = (figmaName) => {
  let m;
  if ((m = figmaName.match(/^colors\/(gb-[a-z]+)\/(\d+)$/))) return `--${m[1]}-${m[2]}`;
  if ((m = figmaName.match(/^foundations\/([a-z]+)$/))) return `--gb-foundation-${m[1]}`;
  if ((m = figmaName.match(/^scale\/(\d+)$/))) return `--gb-scale-${m[1]}`;
  return `--gb-${figmaName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
};

const round = (n) => Math.round(n * 10000) / 10000;
const FONT_VAR = { "Bowlby One": "var(--font-display)", "Space Grotesk": "var(--font-ui)", "Courier Prime": "var(--font-catalog)" };
const WEIGHT = { Light: 300, Regular: 400, Medium: 500, "Semi Bold": 600, Bold: 700, "400": 400 };
const resolveBrand = (v) => (v && typeof v === "object" && v.alias ? Brand[v.alias]?.value : v);

const lines = [];
const theme = [];
const out = (s = "") => lines.push(s);

// --- Brand: colors and scale ----------------------------------------------
out("  /* Brand: base color ramps */");
const ramps = new Set();
for (const [name, { type, value }] of Object.entries(Brand)) {
  if (type !== "COLOR") continue;
  const v = cssName(name);
  out(`  ${v}: ${value};`);
  const ramp = name.match(/^colors\/(gb-[a-z]+)\//)?.[1];
  if (ramp) ramps.add(ramp);
  theme.push(`  --color${v.slice(1)}: var(${v});`);
}
out();
out("  /* Brand: spacing scale, px from Figma written as rem (16px = 1rem) */");
const scale = Object.entries(Brand)
  .filter(([n, t]) => t.type === "FLOAT" && n.startsWith("scale/"))
  .sort((a, b) => Number(a[0].split("/")[1]) - Number(b[0].split("/")[1]));
for (const [name, { value }] of scale) out(`  ${cssName(name)}: ${round(value / 16)}rem; /* ${round(value)}px */`);

// The 500 step of each ramp is the brand color itself: --gb-yellow etc.
out();
out("  /* Brand: the core color of each ramp (its 500 step) */");
for (const ramp of ramps) {
  out(`  --${ramp}: var(--${ramp}-500);`);
  theme.push(`  --color-${ramp}: var(--${ramp});`);
}

// --- Mapped: roles ---------------------------------------------------------
out();
out("  /* Mapped: role names. Components use these, not the ramps. */");
for (const [name, { value }] of Object.entries(Mapped)) {
  const target = value?.alias ? `var(${cssName(value.alias)})` : value;
  const v = cssName(name);
  out(`  ${v}: ${target};`);
  theme.push(`  --color${v.slice(1)}: var(${v});`);
}

// --- Alias: type slots (rem mode) -------------------------------------------
out();
out("  /* Alias: type slots, rem mode */");
const slots = [...new Set(Object.keys(Alias).map((n) => n.split("--text-")[1]))];
for (const slot of slots) {
  const get = (kind) => Alias[`${kind}/--text-${slot}`]?.modes;
  const size = get("Size")?.rem;
  const line = get("Line height")?.rem;
  const font = resolveBrand(get("Font")?.rem);
  const weight = WEIGHT[resolveBrand(get("Weight")?.rem)];
  out(`  --gb-type-${slot}-size: ${size}rem;`);
  out(`  --gb-type-${slot}-line-height: ${line}rem;`);
  out(`  --gb-type-${slot}-weight: ${weight};`);
  out(`  --gb-type-${slot}-font: ${FONT_VAR[font] ?? `"${font}"`};`);
  theme.push(`  --text-${slot}: var(--gb-type-${slot}-size);`);
  theme.push(`  --text-${slot}--line-height: var(--gb-type-${slot}-line-height);`);
  theme.push(`  --text-${slot}--font-weight: var(--gb-type-${slot}-weight);`);
}

const css = `/* ==========================================================================
   Gutbuster design tokens. GENERATED, do not edit by hand.
   Source: Gutbuster DS Figma library (design/tokens.json, synced ${tokens.syncedAt}).
   To change a value: change it in Figma, sync tokens, run \`npm run tokens\`.
   ========================================================================== */

:root {
${lines.join("\n")}
}

/* Tailwind utilities for the tokens above (bg-gb-*, text-gb-*, text-<slot>). */
@theme inline {
${theme.join("\n")}
}
`;

writeFileSync(join(root, "src", "app", "tokens.css"), css);
console.log(`Wrote src/app/tokens.css: ${theme.length} Tailwind tokens from ${Object.keys(Brand).length + Object.keys(Alias).length + Object.keys(Mapped).length} Figma variables.`);
