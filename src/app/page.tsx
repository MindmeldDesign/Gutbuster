import FeedFilter from "@/components/FeedFilter";
import { getFeedVideos } from "@/lib/data";

// Mobile home: every video in the content snapshot, all kinds mixed
// together, in Airtable's order. FeedFilter adds the Improv 101 /
// Full sets / Scenes chips on top.
//
// Fully static: the page is built once from content/snapshot.json and
// changes only when a new snapshot is committed and deployed. There's no
// runtime data fetch, so no loading or "Airtable didn't answer" state.

export default async function HomePage() {
  const videos = await getFeedVideos();

  if (videos.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-4 pt-10">
        <h1 className="font-ui text-xl font-bold text-gb-ink">Nothing on the shelves yet.</h1>
        <p className="text-base text-gb-ink">
          Add a row to the Videos table in Airtable, run the import, and commit the snapshot.
        </p>
      </div>
    );
  }

  return <FeedFilter videos={videos} />;
}
