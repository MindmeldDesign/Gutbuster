// npm run import:csv
//
// Builds content/snapshot.json from Airtable's own CSV downloads, so a
// content update costs zero API calls. Export each table from Airtable
// (view menu > Download CSV) and save them as:
//
//   content/csv/Theaters.csv
//   content/csv/Teams.csv
//   content/csv/Shows.csv
//   content/csv/Videos.csv
//
// CSV exports write linked records as the linked row's primary field
// (a team's Name, a show's Title), not its record ID. This script maps
// those names back to IDs. A name that appears twice in its table can't
// be resolved safely, so the link is left empty and the report says so.
//
// Record IDs: add a formula field named "Record ID" with the formula
// RECORD_ID() to every table. The export then carries Airtable's real
// IDs, which stay the same when you switch to `npm run sync`. Without
// it, the script makes IDs from names and warns you.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./lib/csv.mjs";
import { buildSnapshot } from "./lib/normalize.mjs";
import { lookupChannels } from "./lib/oembed.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const csvDir = join(root, "content", "csv");
const outFile = join(root, "content", "snapshot.json");

// table key -> CSV file, primary field, and which fields link where
const TABLES = {
  theaters: { file: "Theaters.csv", primary: "Name", links: {} },
  teams: { file: "Teams.csv", primary: "Name", links: { "Home Theater": "theaters" } },
  shows: { file: "Shows.csv", primary: "Title", links: { Team: "teams", "Performed At": "theaters" } },
  videos: { file: "Videos.csv", primary: "Video Title", links: { Show: "shows", Team: "teams", Theater: "theaters" } },
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Splits a linked-record cell into names. Airtable separates names with
// commas and wraps any name that itself contains a comma in double quotes
// (doubling quotes inside it), e.g.  "Love, Death, & Bowling",Geology
function splitLinkedNames(cell) {
  const names = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < cell.length; i++) {
    const ch = cell[i];
    if (quoted) {
      if (ch === '"' && cell[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"' && cur.trim() === "") {
      quoted = true;
      cur = "";
    } else if (ch === ",") {
      names.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  names.push(cur.trim());
  return names.filter(Boolean);
}

// Airtable writes attachments as "file.png (https://...)", comma-separated.
// Only the first one is used. These URLs expire after a few hours.
function firstAttachmentUrl(cell) {
  const match = (cell ?? "").match(/\((https?:\/\/[^)\s]+)\)/);
  return match?.[1];
}

// --- Read ---------------------------------------------------------------

const missing = Object.values(TABLES).filter((t) => !existsSync(join(csvDir, t.file)));
if (missing.length > 0) {
  mkdirSync(csvDir, { recursive: true });
  console.error(`Missing CSV exports in content/csv/: ${missing.map((t) => t.file).join(", ")}`);
  console.error("In Airtable, open each table, use the view menu > Download CSV, and save it under that name.");
  process.exit(1);
}

const warnings = [];
let usedFallbackIds = false;
const raw = {};

for (const [key, t] of Object.entries(TABLES)) {
  const rows = parseCsv(readFileSync(join(csvDir, t.file), "utf8"));
  raw[key] = rows.map((fields, i) => {
    let id = (fields["Record ID"] ?? "").trim();
    if (!id) {
      usedFallbackIds = true;
      id = `csv-${key}-${slug(fields[t.primary] ?? "") || i + 1}`;
    }
    return { id, fields };
  });
}

if (usedFallbackIds) {
  warnings.push('Some tables have no "Record ID" column. Add a formula field named Record ID with RECORD_ID() to every table so IDs stay stable.');
}

// --- Resolve links: names -> record IDs --------------------------------

const nameIndex = {};
const dupeNames = {};
for (const [key, t] of Object.entries(TABLES)) {
  const byName = new Map();
  const dupes = new Set();
  for (const { id, fields } of raw[key]) {
    const name = (fields[t.primary] ?? "").trim();
    if (!name) continue;
    if (byName.has(name)) dupes.add(name);
    byName.set(name, id);
  }
  for (const name of dupes) {
    const linked = Object.values(TABLES).some((other) => Object.values(other.links).includes(key));
    if (linked) warnings.push(`${t.file}: "${name}" appears more than once, so links to it can't be resolved. Rename one.`);
    byName.delete(name);
  }
  nameIndex[key] = byName;
  dupeNames[key] = dupes;
}

const tables = {};
for (const [key, t] of Object.entries(TABLES)) {
  tables[key] = raw[key].map(({ id, fields }) => {
    const out = { ...fields };
    for (const [field, target] of Object.entries(t.links)) {
      const cell = (fields[field] ?? "").trim();
      if (!cell) {
        out[field] = [];
        continue;
      }
      const names = splitLinkedNames(cell);
      out[field] = names
        .map((name) => {
          const linkedId = nameIndex[target].get(name);
          if (!linkedId) {
            const why = dupeNames[target].has(name) ? "a duplicated name" : `not found in ${TABLES[target].file}`;
            warnings.push(`${t.file}: "${fields[t.primary] || id}" links ${field} to "${name}", which is ${why}. Link left empty.`);
          }
          return linkedId;
        })
        .filter(Boolean);
    }
    if ("Icon" in fields) out.__iconUrl = firstAttachmentUrl(fields["Icon"]);
    return { id, fields: out };
  });
}

// --- Channels: who posted each video (cached, see lib/oembed.mjs) ------------

const urlOf = (f) => (f["URL"] ?? f["Embed URL"] ?? "").trim();
const { channels, fetched, failures } = await lookupChannels(
  tables.videos.map(({ fields }) => urlOf(fields)),
  join(root, "content", "oembed-cache.json")
);
for (const { fields } of tables.videos) {
  const hit = channels[urlOf(fields)];
  if (hit) {
    fields.__channel = hit.channel;
    fields.__channelUrl = hit.channelUrl;
  }
}
if (fetched > 0) console.log(`Looked up ${fetched} new channel name${fetched === 1 ? "" : "s"}.`);
for (const f of failures) warnings.push(`Couldn't look up the channel for ${f}. It'll retry next import.`);

// --- Build + write -------------------------------------------------------

const { snapshot, warnings: checks } = buildSnapshot(tables, { source: "csv" });
warnings.push(...checks);

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(snapshot, null, 2) + "\n");

const c = snapshot.counts;
console.log(`Wrote content/snapshot.json: ${c.videos} videos, ${c.shows} shows, ${c.teams} teams, ${c.theaters} theaters.`);
if (warnings.length === 0) {
  console.log("No warnings. Clean import.");
} else {
  console.log(`\n${warnings.length} warning${warnings.length === 1 ? "" : "s"}:`);
  for (const w of warnings) console.log(`  - ${w}`);
}
