import type { Env, NewsItem } from "../types";

// Finnhub free tier: https://finnhub.io/docs/api/market-news
// GET /api/v1/news?category=general&token=API_KEY
export async function getGlobalNews(env: Env, limit = 6): Promise<NewsItem[]> {
  const url = `https://finnhub.io/api/v1/news?category=general&token=${env.FINNHUB_API_KEY}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Finnhub news failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as Array<{
    headline: string;
    url: string;
    source: string;
  }>;

  return data.slice(0, limit).map((item) => ({
    headline: item.headline,
    url: item.url,
    source: item.source,
  }));
}
