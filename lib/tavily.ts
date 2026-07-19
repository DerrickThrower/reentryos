import { TavilyResult, SearchResults } from '@/types';

export async function tavilySearch(query: string): Promise<TavilyResult[]> {
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

export async function searchResources(city: string, state: string): Promise<SearchResults> {
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

  return { housing, benefits, clinics, employers, food_banks, dmv };
}
