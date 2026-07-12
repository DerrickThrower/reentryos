import { TavilyResult, SearchResults } from '@/types';

async function tavilySearch(query: string): Promise<TavilyResult[]> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 5,
        search_depth: 'advanced',
        include_answer: false,
      }),
    });

    if (!response.ok) {
      console.error(`Tavily search failed: ${response.status} for query: ${query}`);
      return [];
    }

    const data = await response.json();
    return (data.results || []) as TavilyResult[];
  } catch (err) {
    console.error(`Tavily search error for query "${query}":`, err);
    return [];
  }
}

// Resource listings change slowly; cache per city/state so repeat intakes
// on the same warm instance skip all 6 external searches.
const CACHE_TTL_MS = 15 * 60 * 1000;
const searchCache = new Map<string, { results: SearchResults; expiresAt: number }>();

export async function searchResources(city: string, state: string): Promise<SearchResults> {
  const cacheKey = `${city.trim().toLowerCase()}|${state.trim().toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const queries = [
    `${city} ${state} reentry homeless shelters transitional housing`,
    `${city} ${state} Medicaid SNAP benefits office enrollment location address phone`,
    `${city} ${state} free clinic uninsured medical care walk-in`,
    `${city} ${state} second chance employers reentry friendly hiring felony`,
    `${city} ${state} food bank pantry free meals`,
    `${city} ${state} DMV state ID application office address hours`,
  ];

  const [housing, benefits, clinics, employers, food_banks, dmv] = await Promise.all(
    queries.map((q) => tavilySearch(q))
  );

  const results = { housing, benefits, clinics, employers, food_banks, dmv };

  // Only cache useful responses — don't pin an outage or empty result set for 15 min.
  if (Object.values(results).some((r) => r.length > 0)) {
    searchCache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  return results;
}
