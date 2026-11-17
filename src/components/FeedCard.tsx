import type { FeedVideo } from "@/types/gutbuster";

// One video in the mobile feed. Built from the Figma card component
// ("SpineCardViolet", node 2:2): colored thumb with a play glyph and a
// menu button, a blue form band, then a body with a round profile
// image, the title, and three lines of catalog metadata.
//
// Every field is optional because the feed shows Airtable records as
// they are. Missing pieces simply don't render.

// Thumb fallbacks when there is no YouTube thumbnail, cycling through
// the same three colors the Figma frame uses.
const THUMB_COLORS = ["bg-gb-violet", "bg-gb-tangerine", "bg-gb-turquoise"];

// Pulls the 11-character YouTube id out of any common YouTube URL shape
// (watch?v=, youtu.be/, embed/, shorts/). Reads the URL itself rather
// than Source Platform, so a mistyped platform value can't hide a thumb.
function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

function getYear(video: FeedVideo): string | null {
  const date = video.show?.datePerformed || video.uploadDate;
  return date ? date.slice(0, 4) : null;
}

export default function FeedCard({ video, index }: { video: FeedVideo; index: number }) {
  const youTubeId = video.embedUrl ? getYouTubeId(video.embedUrl) : null;
  const thumbnail = youTubeId ? `https://i.ytimg.com/vi/${youTubeId}/hqdefault.jpg` : null;

  const title = video.title || video.show?.title || "Untitled video";
  // Band reads like a spine sticker: kind first, then form(s), e.g.
  // "FULL SET / HAROLD". In a mixed feed the kind is the first thing
  // you need to know about a tape.
  const bandParts = [video.cutType, ...(video.show?.forms ?? [])].filter(Boolean);
  const band = bandParts.length > 0 ? bandParts.join(" / ") : null;
  const year = getYear(video);
  // Credit line: the team for performances; for talks and demos with no
  // team, the Source typed in Airtable, otherwise the channel that posted it.
  const credit = video.team?.name ?? video.source ?? video.channel;
  const meta = [credit, video.theater?.name, year].filter(Boolean) as string[];
  // Round picture: the team's icon for performances; for talks and demos
  // with no team, the channel's logo. The theater's icon fills in otherwise.
  const profileUrl =
    (video.team ? video.team.iconUrl : video.channelLogo) ?? video.theater?.iconUrl ?? null;

  const card = (
    <article className="gb-card-shadow relative flex w-full flex-col">
      {/* Thumb */}
      <div
        className={`gb-thumb relative w-full overflow-hidden border-b-2 border-gb-ink ${
          THUMB_COLORS[index % THUMB_COLORS.length]
        }`}
      >
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            loading={index < 2 ? "eager" : "lazy"}
            className="absolute inset-0 size-full object-cover"
          />
        )}

        {/* Play glyph: cream triangle with an ink outline */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="absolute left-2 top-2 size-6"
        >
          <path
            d="M5 3.5 L20.5 12 L5 20.5 Z"
            fill="var(--gb-cream)"
            stroke="var(--gb-ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>

        {/* Menu button: visual only until the shelf feedback flow is built */}
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 flex size-6 items-center justify-center gap-0.5 border-2 border-gb-ink bg-gb-card"
        >
          <span className="size-1 rounded-full bg-gb-ink" />
          <span className="size-1 rounded-full bg-gb-ink" />
          <span className="size-1 rounded-full bg-gb-ink" />
        </span>
      </div>

      {/* Kind / form band */}
      {band && (
        <div className="flex w-full bg-gb-blue px-2 py-0.5">
          <p className="pt-px font-catalog text-catalog font-bold uppercase text-gb-cream">
            {band}
          </p>
        </div>
      )}

      {/* Body */}
      <div className="flex w-full items-start gap-1 bg-gb-card px-2 py-1">
        <div className="size-12 shrink-0 overflow-hidden rounded-full bg-gb-placeholder">
          {profileUrl && (
            // no-referrer: YouTube's image server refuses logo requests that
            // say which site they came from (hotlink protection).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profileUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
          )}
        </div>

        <div className="flex min-h-16 min-w-px flex-1 flex-col gap-1 overflow-hidden">
          <h2 className="w-full truncate font-ui text-card font-bold text-gb-ink">{title}</h2>
          {meta.length > 0 && (
            <div className="flex w-full flex-col font-catalog text-catalog uppercase gb-meta text-gb-text-light">
              {meta.map((line, i) => (
                <p key={i} className="w-full truncate">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );

  // Until the watch page exists, tapping a card opens the video where
  // it lives (YouTube, Vimeo, etc.) in a new tab.
  return video.embedUrl ? (
    <a
      href={video.embedUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Watch ${title}`}
      className="block w-full"
    >
      {card}
    </a>
  ) : (
    card
  );
}
