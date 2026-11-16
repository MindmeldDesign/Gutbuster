// Minimal CSV reader for Airtable's "Download CSV" files.
//
// Handles what Airtable actually emits: a header row, commas inside
// quoted cells, doubled quotes ("") as an escaped quote, line breaks
// inside quoted cells (long text fields like Bio), CRLF line endings,
// and a leading byte-order mark. No dependency, so installing it can
// never disturb node_modules.

export function parseCsv(text) {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [header = [], ...body] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  const names = header.map((h) => h.trim());
  return body.map((r) => Object.fromEntries(names.map((name, i) => [name, r[i] ?? ""])));
}
