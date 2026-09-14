import Airtable from "airtable";

// Reads from environment variables -- never hardcode these.
// Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env.local (gitignored)
// and again in Vercel's project environment variables for production.
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.warn(
    "Airtable env vars are missing. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env.local"
  );
}

let _base: Airtable.Base | null = null;

// Lazily construct the Airtable client so importing this module never
// throws. The error only surfaces when a table is actually queried.
function getBase(): Airtable.Base {
  if (!apiKey || !baseId) {
    throw new Error(
      "Airtable env vars are missing. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env.local"
    );
  }
  if (!_base) {
    _base = new Airtable({ apiKey }).base(baseId);
  }
  return _base;
}

// Airtable's base object is callable (base('TableName')) AND has methods,
// so the proxy target must be a function to support both.
export const base: Airtable.Base = new Proxy(function () {} as unknown as Airtable.Base, {
  get(_target, prop) {
    return Reflect.get(getBase(), prop as keyof Airtable.Base);
  },
  apply(_target, thisArg, args) {
    return Reflect.apply(getBase() as unknown as (...a: unknown[]) => unknown, thisArg, args);
  },
});

// Table names -- centralized here so a rename in Airtable only needs
// updating in one place.
export const TABLES = {
  shows: "Shows",
  videos: "Videos",
  theaters: "Theaters",
  teams: "Teams",
} as const;