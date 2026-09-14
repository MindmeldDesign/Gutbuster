import type { VideoWithContext } from "@/types/gutbuster";
import VideoCard from "./VideoCard";

interface VideoRowProps {
  title: string;
  videos: VideoWithContext[];
  // Whether cards in this row should show a Cut Type badge (e.g. "FULL
  // SET", "EXERCISE DEMO"). Defaults to true. Set to false on rows that
  // are ALREADY filtered by Cut Type -- e.g. the "Full Sets" row, where
  // every card is a Full Set, so repeating that on each card is
  // redundant: the section header already told you. Form rows (Harold,
  // Armando, etc.) and Spotlight keep it on, since Cut Type is genuinely
  // new information there.
  showCutType?: boolean;
}

export default function VideoRow({ title, videos, showCutType = true }: VideoRowProps) {
  if (videos.length === 0) {
    return (
      <section className="mb-10">
        <h2 className="font-sans text-2xl mb-3 px-4">{title}</h2>
        <p className="px-4 text-sm text-gb-black/60 italic">
          Be kind, rewind. Nothing here yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <h2 className="font-sans text-2xl mb-3 px-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto px-4 pb-3">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} showCutType={showCutType} />
        ))}
      </div>
    </section>
  );
}