import { base, TABLES } from "./airtable";
import type {
  Theater,
  Team,
  Show,
  Video,
  VideoWithContext,
  ImprovForm,
  CutType,
} from "@/types/gutbuster";

export const REVALIDATE_SECONDS =
  process.env.NODE_ENV === "development" ? 10 : 900;

import { unstable_cache } from "next/cache";

// --- Mappers: Airtable records -> our clean TypeScript types ----------

function mapTheater(record: any): Theater {
  return {
    id: record.id,
    name: record.get("Name") ?? "",
    location: record.get("City") ?? undefined,
    subscriberCount: record.get("Subscriber Count") ?? undefined,
    iconUrl: record.get("Icon")?.[0]?.url ?? undefined,
    theaterInfo: record.get("Theater Info") ?? undefined,
  };
}

function mapTeam(record: any): Team {
  return {
    id: record.id,
    name: record.get("Name") ?? "",
    homeTheaterId: record.get("Home Theater")?.[0] ?? undefined,
    subscriberCount: record.get("Subscriber Count") ?? undefined,
    iconUrl: record.get("Icon")?.[0]?.url ?? undefined,
    bio: record.get("Bio") ?? undefined,
  };
}

function mapShow(record: any): Show {
  return {
    id: record.id,
    title: record.get("Title") ?? "",
    teamId: record.get("Team")?.[0] ?? "",
    performedAtId: record.get("Performed At")?.[0] ?? undefined,
    datePerformed: record.get("Date Performed") ?? undefined,
    suggestion: record.get("Suggestion") ?? undefined,
    forms: (record.get("Form") ?? []) as ImprovForm[],
    style: record.get("Style") ?? [],
    speed: record.get("Speed") ?? [],
  };
}

function mapVideo(record: any): Video {
  return {
    id: record.id,
    title: record.get("Auto Title") || record.get("Video Title") || "",
    showId: record.get("Show")?.[0] ?? undefined,
    teamId: record.get("Team")?.[0] ?? undefined,
    theaterId: record.get("Theater")?.[0] ?? undefined,
    cutType: (record.get("Cut Type") as CutType) ?? undefined,
    embedUrl: record.get("Embed URL") ?? "",
    sourcePlatform: record.get("Source Platform") ?? "YouTube",
    videoQuality: record.get("Video Quality") ?? undefined,
    hasSubtitles: record.get("Subtitles") ?? false,
    uploadDate: record.get("Upload Date") ?? undefined,
    tags: record.get("Tags") ?? [],
  };
}

// --- Cached fetch functions --------------------------------------------

export const getTheaters = unstable_cache(
  async (): Promise<Theater[]> => {
    const records = await base(TABLES.theaters).select().all();
    return records.map(mapTheater);
  },
  ["gutbuster-theaters"],
  { revalidate: REVALIDATE_SECONDS, tags: ["theaters"] }
);

export const getTeams = unstable_cache(
  async (): Promise<Team[]> => {
    const records = await base(TABLES.teams).select().all();
    return records.map(mapTeam);
  },
  ["gutbuster-teams"],
  { revalidate: REVALIDATE_SECONDS, tags: ["teams"] }
);

export const getShows = unstable_cache(
  async (): Promise<Show[]> => {
    const records = await base(TABLES.shows).select().all();
    return records.map(mapShow);
  },
  ["gutbuster-shows"],
  { revalidate: REVALIDATE_SECONDS, tags: ["shows"] }
);

export const getVideos = unstable_cache(
  async (): Promise<Video[]> => {
    const records = await base(TABLES.videos).select().all();
    return records.map(mapVideo);
  },
  ["gutbuster-videos"],
  { revalidate: REVALIDATE_SECONDS, tags: ["videos"] }
);

// --- Joined/derived data -------------------------------------------------

export async function getVideosWithContext(): Promise<VideoWithContext[]> {
  const [videos, shows, teams, theaters] = await Promise.all([
    getVideos(),
    getShows(),
    getTeams(),
    getTheaters(),
  ]);

  const showsById = new Map(shows.map((s) => [s.id, s]));
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const theatersById = new Map(theaters.map((t) => [t.id, t]));

  return videos
    .map((video) => {
      const show = video.showId ? showsById.get(video.showId) : undefined;

      const team = show
        ? teamsById.get(show.teamId)
        : video.teamId
        ? teamsById.get(video.teamId)
        : undefined;
      if (!team) return null;

      // Theater resolution: Show's venue is authoritative when a Show
      // exists, otherwise fall back to the Video's own direct Theater
      // link -- this is what makes standalone/Spotlight clips (which
      // may have no Show) still resolve a theater and city.
      const theater = show?.performedAtId
        ? theatersById.get(show.performedAtId)
        : video.theaterId
        ? theatersById.get(video.theaterId)
        : undefined;

      console.log(video.title, "| theaterId:", video.theaterId, "| resolved theater:", theater);  // <-- ADD THIS LINE

      return {
        ...video,
        team,
        ...(show ? { show } : {}),
        ...(theater ? { theater } : {}),
      };
    })
    .filter((v): v is VideoWithContext => v !== null);
}

export async function getFeaturedVideos(): Promise<VideoWithContext[]> {
  const all = await getVideosWithContext();
  return all.filter((v) => v.tags?.includes("Featured"));
}

export async function getFullSetVideos(): Promise<VideoWithContext[]> {
  const all = await getVideosWithContext();
  return all.filter((v) => v.cutType === "Full Set");
}

export async function getVideosByTag(tag: string): Promise<VideoWithContext[]> {
  const all = await getVideosWithContext();
  return all.filter((v) => v.tags?.includes(tag));
}

export async function getVideosByForm(form: ImprovForm): Promise<VideoWithContext[]> {
  const all = await getVideosWithContext();
  return all.filter((v) => v.show?.forms?.includes(form));
}

export async function getVideosByTeam(teamId: string): Promise<VideoWithContext[]> {
  const all = await getVideosWithContext();
  return all.filter((v) => v.team.id === teamId);
}

export async function getVideosByTheater(theaterId: string): Promise<VideoWithContext[]> {
  const all = await getVideosWithContext();
  return all.filter((v) => v.theater?.id === theaterId);
}

export function isHomeGame(show: Show, team: Team): boolean {
  return !!show.performedAtId && show.performedAtId === team.homeTheaterId;
}