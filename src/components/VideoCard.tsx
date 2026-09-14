import type { VideoWithContext } from "@/types/gutbuster";

interface VideoCardProps {
  video: VideoWithContext;
  // Whether to show the Cut Type badge (e.g. "FULL SET"). False when
  // the surrounding row is already filtered by Cut Type, since
  // repeating it on every card would be redundant -- see VideoRow.
  showCutType?: boolean;
}

// Pulls a thumbnail from a YouTube embed URL. Other platforms can be
// added here as you support them -- for now this assumes the common
// case (YouTube) and falls back to a placeholder block otherwise.
function getThumbnailUrl(video: VideoWithContext): string | null {
  if (video.sourcePlatform !== "YouTube") return null;
  const match = video.embedUrl.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  const videoId = match?.[1];
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

export default function VideoCard({ video, showCutType = true }: VideoCardProps) {
  const thumbnail = getThumbnailUrl(video);
  // video.show is OPTIONAL now -- a standalone exercise/teaching clip
  // may have no Show at all, so every reference below falls back
  // gracefully rather than assuming it exists.
  const displayTitle = video.title || video.show?.title || "Untitled Video";

  // Form (HAROLD / ARMANDO / etc.) -- only exists when the video is
  // tied to a real Show with a Form set. Standalone exercise clips
  // won't have one, and that's fine, the badge just doesn't render.
  const form =
    video.show?.forms && video.show.forms.length > 0
      ? video.show.forms.join(" / ")
      : null;

  // Cut Type badge only renders when explicitly allowed (showCutType)
  // AND a Cut Type actually exists on this video.
  const showCutTypeBadge = showCutType && !!video.cutType;

  return (
    <a
      href={`/watch/${video.id}`}
      className="block w-64 shrink-0 border-3 border-gb-black bg-white gb-shadow transition-all duration-150"
    >
      <div className="relative aspect-video w-full bg-gb-black overflow-hidden border-b-3 border-gb-black">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={displayTitle}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gb-cream/60 text-sm">
            No preview available
          </div>
        )}

        <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
          {form && (
            <span className="bg-gb-blue text-gb-cream text-sm font-label uppercase tracking-wide leading-none px-2 py-1 pt-1.5 border-2 border-gb-black">
              {form}
            </span>
          )}
          {showCutTypeBadge && (
            <span className="bg-gb-cream text-gb-blue text-sm font-label uppercase tracking-wide leading-none px-2 py-1 pt-1.5 border-2 border-gb-blue">
              {video.cutType}
            </span>
          )}
          <span className="bg-gb-yellow text-gb-black text-sm font-label uppercase tracking-wide leading-none px-2 py-1 pt-1.5 border-2 border-gb-black">
            {video.team.name}
          </span>
        </div>
      </div>

      <div className="p-3">
        <p className="font-sans text-sm leading-tight line-clamp-2 mb-2">
          {displayTitle}
        </p>

        {/* Metadata cluster: Theater name, with its city displayed
            directly below it. Both fall back gracefully when a video
            has no associated theater (e.g. standalone clips). */}
        <div className="space-y-0.5">
          <p className="text-sm font-label text-gb-black/50">
            {video.theater?.name ?? "\u00A0"}
          </p>
          {video.theater?.location && (
          <p className="text-sm font-label text-gb-black/50 italic">
            {video.theater.location}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}