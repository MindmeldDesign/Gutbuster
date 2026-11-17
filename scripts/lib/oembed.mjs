// Looks up who posted each video (the channel) from the video's own link,
// using YouTube's and Vimeo's public oEmbed endpoints. No API key and no
// Airtable calls involved.
//
// Results are cached in content/oembed-cache.json, keyed by URL, so each
// link is fetched once ever: re-imports are instant, work offline, and the
// cache is committed with the snapshot so every build sees the same names.
// A failed lookup is reported and retried on the next import.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const ENDPOINTS = [
  { match: /(?:youtube\.com|youtu\.be)\//i, url: (u) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}` },
  { match: /vimeo\.com\//i, url: (u) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}` },
];

export async function lookupChannels(urls, cacheFile) {
  const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
  const failures = [];
  let fetched = 0;

  for (const url of new Set(urls.filter(Boolean))) {
    if (cache[url]) continue;
    const endpoint = ENDPOINTS.find((e) => e.match.test(url));
    if (!endpoint) continue; // platform without oEmbed: rely on the Source field
    try {
      const res = await fetch(endpoint.url(url), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.author_name) {
        cache[url] = { channel: data.author_name, channelUrl: data.author_url };
        fetched++;
      }
    } catch (err) {
      failures.push(`${url} (${err.name === "TimeoutError" ? "timed out" : err.message})`);
    }
  }

  // Sorted keys keep the cache file's git diffs small and stable.
  const sorted = Object.fromEntries(Object.keys(cache).sort().map((k) => [k, cache[k]]));
  writeFileSync(cacheFile, JSON.stringify(sorted, null, 2) + "\n");
  return { channels: cache, fetched, failures };
}
