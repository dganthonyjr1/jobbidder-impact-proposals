/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Copyright (c) 2026 [Your Company Name]. All rights reserved.
 * Trade Secret — Unauthorized use or distribution is strictly prohibited.
 * ============================================================================
 *
 * Contractor Sourcing Engine
 *
 * Finds real contractors via Google Places API Text Search, maps them to the
 * correct NGS service niche, and returns structured results ready for the
 * dashboard recruit flow.
 *
 * Requires: GOOGLE_PLACES_API_KEY (Google Cloud project with Places API enabled)
 */

import { NGS_SERVICE_NICHES, detectNiche, type NgsNiche } from "./contractor-recruit.server";

// ---------------------------------------------------------------------------
// Major cities per NGS operating state
// ---------------------------------------------------------------------------

export const NGS_STATE_CITIES: Record<string, string[]> = {
  CA: ["Los Angeles", "San Diego", "San Francisco", "Sacramento", "San Jose", "Fresno", "Long Beach", "Oakland"],
  NV: ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks"],
  AZ: ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale", "Tempe", "Gilbert"],
  TX: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth", "El Paso", "Arlington", "Plano"],
};

// ---------------------------------------------------------------------------
// Google Places API v1 (New) types
// ---------------------------------------------------------------------------

type PlacesTextSearchRequest = {
  textQuery: string;
  maxResultCount?: number;
  languageCode?: string;
  locationBias?: {
    rectangle?: {
      low: { latitude: number; longitude: number };
      high: { latitude: number; longitude: number };
    };
    circle?: {
      center: { latitude: number; longitude: number };
      radius: number;
    };
  };
};

type PlaceResult = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  types?: string[];
};

// ---------------------------------------------------------------------------
// Sourced contractor — what the dashboard receives
// ---------------------------------------------------------------------------

export type SourcedContractor = {
  /** Google Places place_id — used as source_ref */
  place_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  /** Best-matched NGS niche */
  niche: NgsNiche;
  /** The search query that surfaced this result */
  search_query: string;
  /** State from the search */
  state: string;
  city: string;
};

export type ContractorSearchResult = {
  ok: boolean;
  contractors: SourcedContractor[];
  query: string;
  error?: string;
  source: "google_places" | "mock";
};

// ---------------------------------------------------------------------------
// Search query builders per niche
// ---------------------------------------------------------------------------

function buildSearchQueries(niche: NgsNiche, city: string, state: string): string[] {
  const location = `${city}, ${state}`;
  const label = niche.label.toLowerCase();

  // Primary query uses niche label + "contractor"
  const primary = `${label} contractor ${location}`;

  // Secondary uses the most specific keyword
  const specificKw = niche.keywords[0] ?? label;
  const secondary = `${specificKw} ${location}`;

  // Tertiary uses the parent service
  const tertiary = `${niche.parentService.toLowerCase()} contractor ${location}`;

  return [primary, secondary, tertiary];
}

// ---------------------------------------------------------------------------
// Google Places Text Search (New Places API v1)
// ---------------------------------------------------------------------------

async function searchGooglePlaces(
  query: string,
  maxResults = 20,
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured");
  }

  const body: PlacesTextSearchRequest = {
    textQuery: query,
    maxResultCount: Math.min(maxResults, 20),
    languageCode: "en",
  };

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
        "places.userRatingCount",
        "places.primaryType",
        "places.types",
      ].join(","),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Google Places API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  return (json.places as PlaceResult[]) ?? [];
}

// ---------------------------------------------------------------------------
// Public search function
// ---------------------------------------------------------------------------

/**
 * Search for contractors matching a given NGS niche in a specific city + state.
 * Returns up to `maxResults` unique results deduplicated by place_id.
 */
export async function searchContractorsForNiche(opts: {
  nicheId: string;
  state: string;
  city?: string;
  maxResults?: number;
}): Promise<ContractorSearchResult> {
  const { nicheId, state, maxResults = 20 } = opts;

  const niche = NGS_SERVICE_NICHES.find((n) => n.id === nicheId);
  if (!niche) {
    return { ok: false, contractors: [], query: "", error: `Unknown niche: ${nicheId}`, source: "google_places" };
  }

  const stateCities = NGS_STATE_CITIES[state.toUpperCase()] ?? [];
  const city = opts.city || stateCities[0] || state;
  const queries = buildSearchQueries(niche, city, state);
  const primaryQuery = queries[0];

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  // --- No API key: return informative mock so dashboard is usable in dev ----
  if (!apiKey) {
    return {
      ok: true,
      contractors: buildMockResults(niche, city, state),
      query: primaryQuery,
      source: "mock",
    };
  }

  // --- Live Google Places search -------------------------------------------
  const seen = new Set<string>();
  const results: SourcedContractor[] = [];

  for (const query of queries) {
    if (results.length >= maxResults) break;

    try {
      const places = await searchGooglePlaces(query, maxResults - results.length);

      for (const place of places) {
        if (!place.id || seen.has(place.id)) continue;
        seen.add(place.id);

        const phone =
          place.nationalPhoneNumber ||
          place.internationalPhoneNumber ||
          null;

        results.push({
          place_id: place.id,
          name: place.displayName?.text ?? "Unknown Business",
          phone,
          address: place.formattedAddress ?? null,
          website: place.websiteUri ?? null,
          rating: place.rating ?? null,
          review_count: place.userRatingCount ?? null,
          niche,
          search_query: query,
          state: state.toUpperCase(),
          city,
        });
      }
    } catch (e: any) {
      console.error(`[contractor-sourcing] Places search failed for "${query}":`, e?.message);
      // Continue with next query variant
    }
  }

  return {
    ok: true,
    contractors: results.slice(0, maxResults),
    query: primaryQuery,
    source: "google_places",
  };
}

// ---------------------------------------------------------------------------
// Mock results for dev/staging when no API key is set
// ---------------------------------------------------------------------------

function buildMockResults(niche: NgsNiche, city: string, state: string): SourcedContractor[] {
  const mockNames = [
    `${city} ${niche.label} Pros`,
    `${state} ${niche.label} Specialists`,
    `Premier ${niche.label} LLC`,
    `Advanced ${niche.label} Services`,
    `Certified ${niche.label} Solutions`,
  ];

  return mockNames.map((name, i) => ({
    place_id: `mock-${niche.id}-${i}`,
    name,
    phone: `+1${String(3100000000 + i * 1111111).slice(0, 10)}`,
    address: `${1000 + i * 100} Main St, ${city}, ${state} 90000`,
    website: null,
    rating: 4.0 + i * 0.1,
    review_count: 10 + i * 5,
    niche,
    search_query: `${niche.label} contractor ${city} ${state}`,
    state: state.toUpperCase(),
    city,
  }));
}
