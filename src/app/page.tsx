import FeedFilter from "@/components/FeedFilter";
import { getFeedVideos } from "@/lib/data";
import type { FeedVideo } from "@/types/gutbuster";

// Mobile home: every record in the Airtable Videos table, in the order
// Airtable returns it, one card per video, all kinds mixed together.
// FeedFilter adds the Improv 101 / Full Sets / Scenes chips on top.
//
// revalidate: the page is rebuilt at most every 15 minutes in
// production, matching the cache window in src/lib/data.ts, so Airtable
// is never hit per visitor.
export const revalidate = 900;

export default async function HomePage() {
  let videos: FeedVideo[] = [];
  let failed = false;

  try {
    videos = await getFeedVideos();
  } catch (error) {
    console.error("Could not load videos from Airtable:", error);
    failed = true;
  }

  if (failed) {
    return (
      <EmptyState
        title="The shelves didn't load."
        body="Airtable didn't answer. Check the API key and base ID, then refresh."
      />
    );
  }

  if (videos.length === 0) {
    return (
      <EmptyState
        title="Nothing on the shelves yet."
        body="Add a row to the Videos table in Airtable and it shows up here."
      />
    );
  }

  return <FeedFilter videos={videos} />;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2 p-4 pt-10">
      <h1 className="font-ui text-xl font-bold text-gb-ink">{title}</h1>
      <p className="text-base text-gb-ink">{body}</p>
    </div>
  );
}
