import NavBar from "@/components/NavBar";
import VideoRow from "@/components/VideoRow";
import {
  getFeaturedVideos,
  getFullSetVideos,
  getVideosByForm,
  getVideosByTag,
} from "@/lib/data";

// Note: caching here is handled inside src/lib/data.ts via unstable_cache,
// not via a page-level `revalidate` export. Every function in that file
// shares the same REVALIDATE_SECONDS window (15 min in production, 10
// sec in local dev), so Airtable only gets hit once per window no
// matter how many visitors load this page in between.

export default async function HomePage() {
  const [
    featured,
    fullSets,
    harold,
    armando,
    slacker,
    montage,
    objectWork,
    groupGames,
    warmups,
    spotlight,
  ] = await Promise.all([
    getVideosByTag("Spotlight"),
    getVideosByForm("Slacker"),
    getFeaturedVideos(),
    getFullSetVideos(),
    getVideosByForm("Harold"),
    getVideosByForm("Armando"),
    getVideosByForm("Montage"),
    getVideosByTag("Object Work"),
    getVideosByTag("Group Game"),
    getVideosByTag("Warmup"),
  ]);

  return (
    <div className="min-h-screen bg-gb-cream">
      <NavBar />

      <main className="max-w-6xl mx-auto py-8">
        <VideoRow title="Spotlight" videos={featured} />
        {/* showCutType={false} here: every card in this row IS a Full
            Set, so repeating "FULL SET" on each one is redundant --
            the row title already says it. */}
        <VideoRow title="Full Sets" videos={fullSets} showCutType={false} />

        {/* Rows by structural Form -- only videos linked to a Show
            with that Form will appear here. Standalone exercise clips
            (no Show) never show up in these rows. */}
        <VideoRow title="Slacker" videos={slacker} />
        <VideoRow title="Harold" videos={harold} />
        <VideoRow title="Armando" videos={armando} />
        <VideoRow title="Montage" videos={montage} />

        {/* Rows by exercise-type TAG -- these can include both (a)
            scenes pulled from a full performance AND (b) standalone
            teaching clips with no Show/Form at all. Both kinds of
            video can carry these tags directly. */}
        <VideoRow title="Object Work" videos={objectWork} />
        <VideoRow title="Group Games" videos={groupGames} />
        <VideoRow title="Warmups" videos={warmups} />
        <VideoRow title="Spotlight" videos={spotlight} />
      </main>
    </div>
  );
}