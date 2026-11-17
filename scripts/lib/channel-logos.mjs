// Looks up YouTube channel logos (profile pictures) for videos credited by
// their Source or channel, using the official YouTube Data API v3.
//
// Needs YOUTUBE_API_KEY in .env.local. Without it this step is skipped and
// the cards simply show no logo. Each lookup costs 1 unit of the free
// 10,000-per-day quota, and results are cached in content/channel-cache.json.
//
// YouTube's API policies ask apps to use image URLs exactly as returned and
// not to keep API data for more than 30 days without refreshing it. So this
// stores YouTube's own logo URL (it is not downloaded) and re-checks each
// channel once its cached entry is older than 30 days.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const API = "https://www.googleapis.com/youtube/v3/channels";

// Turns a channel link from oEmbed into the right API filter.
function channelQuery(url) {
  const m = url.match(/youtube\.com\/(?:(@[^/?#]+)|channel\/([^/?#]+)|user\/([^/?#]+)|c\/([^/?#]+))/i);
  if (!m) return null;
  if (m[1]) return `forHandle=${encodeURIComponent(m[1])}`;
  if (m[2]) return `id=${encodeURIComponent(m[2])}`;
  if (m[3]) return `forUsername=${encodeURIComponent(m[3])}`;
  if (m[4]) return `forHandle=${encodeURIComponent("@" + m[4])}`;
  return null;
}

export async function lookupChannelLogos(channelUrls, cacheFile, apiKey) {
  const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
  const failures = [];
  let fetched = 0;
  let skippedForKey = 0;
  const now = Date.now();

  for (const url of new Set(channelUrls.filter(Boolean))) {
    const entry = cache[url];
    const fresh = entry && now - Date.parse(entry.fetchedAt) < MAX_AGE_MS;
    if (fresh) continue;
    const query = channelQuery(url);
    if (!query) continue; // not a YouTube channel link (e.g. Vimeo)
    if (!apiKey) {
      skippedForKey++;
      continue;
    }
    try {
      const res = await fetch(`${API}?part=snippet&${query}&key=${encodeURIComponent(apiKey)}`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      const thumbs = data.items?.[0]?.snippet?.thumbnails ?? {};
      const logo = (thumbs.medium ?? thumbs.high ?? thumbs.default)?.url;
      cache[url] = { logo: logo ?? null, fetchedAt: new Date(now).toISOString() };
      fetched++;
    } catch (err) {
      failures.push(`${url} (${err.name === "TimeoutError" ? "timed out" : err.message})`);
    }
  }

  // Drop entries past 30 days that couldn't be refreshed, per YouTube's policy.
  for (const [url, entry] of Object.entries(cache)) {
    if (now - Date.parse(entry.fetchedAt) >= MAX_AGE_MS) delete cache[url];
  }

  const sorted = Object.fromEntries(Object.keys(cache).sort().map((k) => [k, cache[k]]));
  writeFileSync(cacheFile, JSON.stringify(sorted, null, 2) + "\n");
  const logos = new Map(Object.entries(cache).filter(([, e]) => e.logo).map(([u, e]) => [u, e.logo]));
  return { logos, fetched, failures, skippedForKey };
}
