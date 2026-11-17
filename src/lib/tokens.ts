// Library colors as plain hex strings, for the few places that can't use
// CSS variables: the web app manifest and the browser's theme-color tag.
// Reads design/tokens.json (the Gutbuster DS Figma library), so these stay
// in sync with tokens.css.

import tokens from "../../design/tokens.json";

type Entry = { value?: unknown };
const brand = tokens.collections.Brand as Record<string, Entry>;
const mapped = tokens.collections.Mapped as Record<string, Entry>;

// A Brand name ("colors/gb-cream/500") or a Mapped role ("background").
export function tokenHex(name: string): string {
  const entry = mapped[name] ?? brand[name];
  const value = entry?.value as string | { alias: string } | undefined;
  if (value && typeof value === "object") return tokenHex(value.alias);
  if (typeof value !== "string") throw new Error(`No color token named "${name}" in design/tokens.json`);
  return value;
}
