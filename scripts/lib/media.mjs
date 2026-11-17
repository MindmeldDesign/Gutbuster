// Saves team and theater icons into public/media/ so the site never points
// at Airtable's attachment links, which expire a few hours after export.
//
// Each icon is saved once, named by record ID:
//   public/media/teams/recXXXXXXXXXXXXXX.png  ->  served at /media/teams/recXXXXXXXXXXXXXX.png
// Later imports skip icons already on disk, so re-importing never needs a
// fresh link. To pick up a changed icon, run:  npm run import:csv -- --refresh-icons

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const EXT_BY_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

// records: [{ id, name, url }]  ->  Map(id -> "/media/<kind>/<file>")
export async function saveIcons(records, kind, publicDir, { refresh = false } = {}) {
  const dir = join(publicDir, "media", kind);
  mkdirSync(dir, { recursive: true });
  const onDisk = new Map(readdirSync(dir).map((f) => [f.replace(/\.[^.]+$/, ""), f]));

  const paths = new Map();
  const failures = [];
  let saved = 0;

  for (const { id, name, url } of records) {
    const existing = onDisk.get(id);
    if (existing && !(refresh && url)) {
      paths.set(id, `/media/${kind}/${existing}`);
      continue;
    }
    if (!url) continue;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}${res.status === 410 || res.status === 403 ? ", the link has probably expired: export the CSV again" : ""}`);
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      const ext = EXT_BY_TYPE[type] ?? url.split("?")[0].split(".").pop()?.toLowerCase() ?? "img";
      const file = `${id}.${ext}`;
      writeFileSync(join(dir, file), Buffer.from(await res.arrayBuffer()));
      paths.set(id, `/media/${kind}/${file}`);
      saved++;
    } catch (err) {
      failures.push(`icon for "${name || id}" (${err.name === "TimeoutError" ? "timed out" : err.message})`);
      if (existing) paths.set(id, `/media/${kind}/${existing}`); // keep the old file
    }
  }
  return { paths, saved, failures };
}
