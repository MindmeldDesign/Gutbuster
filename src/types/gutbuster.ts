// Gutbuster data model
// Theaters and Teams are separate tables/types (split from a single
// "Channel" table) so a linked-record field can only ever point at the
// correct kind of row -- e.g. Show.performedAtId can only link to a
// Theater, never accidentally to a Team. Comment is stubbed for v2.

// "Form" describes the structural format of a performed improv set
// (Harold, Armando, Slacker, Montaf). It lives ONLY on Show, since it
// only makes sense for an actual structured performance.
export type ImprovForm = "Harold" | "Armando" | "Slacker" | "Montage";

export interface Theater {
  id: string; // Airtable record ID
  name: string;
  location?: string; // city the theater is in
  subscriberCount?: number;
  iconUrl?: string;
  theaterInfo?: string; // bio/description
}

export interface Team {
  id: string; // Airtable record ID
  name: string;
  homeTheaterId?: string; // linked Theater -- set for house teams only.
                           // Blank = indie team.
  subscriberCount?: number;
  iconUrl?: string;
  bio?: string; // team bio/description
}

export interface Show {
  id: string; // Airtable record ID
  title: string;
  teamId: string; // linked Team -- who performed
  performedAtId?: string; // linked Theater -- where THIS show happened.
                           // Compare against the Team's homeTheaterId to tell
                           // a "home game" from a guest/road performance.
  datePerformed?: string; // ISO date string
  suggestion?: string; // the audience suggestion that sparked the show
  forms: ImprovForm[]; // multi-select: Harold / Armando / Slacker / Montage
  style?: string[]; // tags: absurdist, narrative, musical, etc.
  speed?: string[]; // tags: slow burn, high energy, etc.
}

// "Cut Type" describes what kind of recording this Video is --
// the SINGLE source of truth for "is this a Full Set," a scene
// excerpt, a promo, or a standalone exercise demo. This used to be
// duplicated between Cut Type (feeding the Auto Title formula) and a
// "Full Set" Tags entry (feeding the homepage's Full Sets row) -- two
// fields saying the same thing invites exactly the drift that broke
// the Full Sets row: someone removes the tag because Cut Type already
// says it, not realizing the website was still reading from Tags.
// Cut Type is now the only field either of those things reads from.
//
// Note: one Show can have MULTIPLE Video rows pointing at it -- e.g.
// a Full Set recording and a Scene Clip excerpt from the same
// performance, sharing the same Show/Team/Theater but with different
// Cut Type, Embed URL (the scene clip adds a &t= timestamp), and Tags.
// That's intentional, not duplication: each Video row is a distinct
// viewable unit serving a different search/browse intent, even when
// they point at the same underlying source recording.
export type CutType = "Full Set" | "Scene Clip" | "Promo" | "Exercise Demo";

export interface Video {
  id: string; // Airtable record ID
  title: string; // primary field in Airtable -- distinguishes multiple cuts
                  // of the same Show (e.g. "Main Cut" vs "Promo Teaser"),
                  // and is the ONLY required label for standalone clips
                  // that have no Show at all.
  showId?: string; // linked Show -- OPTIONAL. A full performance recording
                    // links to a Show. A standalone teaching/exercise clip
                    // (e.g. a 3-minute object work demo with no audience,
                    // no structured set) may have no Show at all.
  teamId?: string; // linked Team -- OPTIONAL on Video itself. When a Show
                    // is present, its Team is implied and should NOT be
                    // re-entered here -- the data layer reads it through
                    // the Show automatically. Only fill this in directly
                    // when there's no Show to borrow a Team from (a
                    // standalone exercise/teaching clip).
  theaterId?: string; // linked Theater -- OPTIONAL on Video itself, same
                       // pattern as teamId. When a Show is present, its
                       // Theater (Show.performedAtId) is authoritative.
                       // Only fill this in directly when there's no Show
                       // to borrow a Theater from (a standalone clip
                       // filmed at a specific venue).
  cutType?: CutType; // Full Set / Scene Clip / Promo / Exercise Demo --
                      // the single source of truth for what kind of
                      // recording this is. Feeds both Auto Title AND
                      // the homepage's "Full Sets" row.
  embedUrl: string;
  sourcePlatform: "YouTube" | "Vimeo" | "TikTok" | "Instagram" | "DailyMotion" | "Twitch" | "Kick";
  videoQuality?: string;
  hasSubtitles?: boolean;
  uploadDate?: string; // ISO date string
  tags?: string[]; // Featured, Promo, Object Work, Group Game, Warmup,
                    // etc. -- the Are.na-style cross-tagging layer.
                    // NOTE: "Full Set" does NOT live here anymore --
                    // see Cut Type above. Tags is for cross-cutting
                    // labels that aren't already captured by a
                    // dedicated field.
}

// Convenience shape for rendering: a Video joined with its performing
// Team (always present), and -- if this video is tied to an actual
// performance -- its parent Show and the Theater it was performed at.
export interface VideoWithContext extends Video {
  team: Team;
  show?: Show; // absent for standalone exercise/teaching clips
  theater?: Theater; // resolved from the Show's performedAtId when a Show
                      // exists, otherwise from the Video's own theaterId
}