"use client";

import { useState } from "react";
import FeedCard from "@/components/FeedCard";
import { CUT_TYPES, type CutType, type FeedVideo } from "@/types/gutbuster";

// The home feed with its filter chips. Every video is mixed together in
// one feed; tapping a chip narrows it to one kind (Improv 101, Full Sets,
// Scenes) and tapping it again, or tapping "All", clears it.
//
// Why filter in the browser instead of with a ?kind= URL: the page stays
// statically rendered and cached (one Airtable fetch per 15 minutes, not
// per visitor), and switching chips is instant with no network trip. The
// trade-off is that a filtered view can't be shared as a link yet. If
// that matters later, sync the chip to the URL with history.replaceState.
//
// Chips follow the style guide: pill shape, 2px ink outline, hard offset
// shadow. The selected chip is yellow with a blue shadow (yellow elements
// take blue) and sits pressed in at 2px, like a button held down.

type Filter = CutType | "All";

export default function FeedFilter({ videos }: { videos: FeedVideo[] }) {
  const [filter, setFilter] = useState<Filter>("All");

  const counts = new Map<CutType, number>();
  for (const v of videos) {
    if (v.cutType) counts.set(v.cutType, (counts.get(v.cutType) ?? 0) + 1);
  }

  const shown = filter === "All" ? videos : videos.filter((v) => v.cutType === filter);
  const chips: { value: Filter; label: string; count: number }[] = [
    { value: "All", label: "All", count: videos.length },
    ...CUT_TYPES.map((c) => ({ ...c, count: counts.get(c.value) ?? 0 })),
  ];
  const activeLabel = chips.find((c) => c.value === filter)?.label ?? "All";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div
        role="group"
        aria-label="Filter videos by kind"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 pt-1"
      >
        {chips.map((chip) => {
          const active = chip.value === filter;
          return (
            <button
              key={chip.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active && chip.value !== "All" ? "All" : chip.value)}
              className={`gb-chip shrink-0 whitespace-nowrap rounded-full border-2 border-gb-ink px-3 py-1 font-ui text-base font-bold leading-6 text-gb-ink ${
                active ? "gb-chip-active bg-gb-yellow" : "bg-gb-card"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <p
        aria-live="polite"
        className="font-catalog text-catalog uppercase text-gb-text-light"
      >
        {filter === "All"
          ? `${shown.length} ${shown.length === 1 ? "tape" : "tapes"} on the shelf`
          : `${activeLabel} / ${shown.length} ${shown.length === 1 ? "tape" : "tapes"}`}
      </p>

      {shown.length === 0 ? (
        <div className="flex flex-col gap-2 pt-6">
          <h2 className="font-ui text-xl font-bold text-gb-ink">
            No {activeLabel.toLowerCase()} on the shelf yet.
          </h2>
          <p className="text-base text-gb-ink">
            Set a video&apos;s Cut Type to {filter} in Airtable and it shows up here.
            Or tap All and browse the whole store.
          </p>
        </div>
      ) : (
        shown.map((video, index) => <FeedCard key={video.id} video={video} index={index} />)
      )}
    </div>
  );
}
