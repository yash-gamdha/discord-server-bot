import type { Env, IpoItem, NewsItem } from "../types";

// Indian API (indianapi.in): base URL https://stock.indianapi.in
// Auth header: x-api-key
// Docs / live sandbox: https://indianapi.in/sandbox/indian-stock-market
// Response shapes below are based on published docs as of Aug 2026 — the
// service is actively evolving, so if a field comes back undefined, log
// the raw JSON once (e.g. via `wrangler tail`) and adjust the mapping.

const BASE_URL = "https://stock.indianapi.in";

export async function getIndianNews(env: Env, limit = 6): Promise<NewsItem[]> {
  const res = await fetch(`${BASE_URL}/news`, {
    headers: { "x-api-key": env.INDIAN_API_KEY },
  });

  if (!res.ok) {
    throw new Error(`Indian API news failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as Array<{
    title: string;
    summary: string;
    url: string;
    image_url: string;
    source: string;
    pub_date: string;
  }>;

  return data
    .sort((a, b) => new Date(b.pub_date).getTime() - new Date(a.pub_date).getTime())
    .slice(0, limit).map((item) => ({
      headline: item.title,
      url: item.url,
      source: item.source,
    }));
}


export async function getIndianIpos(env: Env): Promise<IpoItem[]> {
  const res = await fetch(`${BASE_URL}/ipo`, {
    headers: { "x-api-key": env.INDIAN_API_KEY },
  });

  if (!res.ok) {
    throw new Error(`Indian API IPO failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as Record<string, any[]>;

  // Response is an object keyed by status; grab all statuses we care about
  // for the digest (upcoming, active, pre_apply — listed/closed are noise here).
  const raw: any[] = [
    ...(data.upcoming ?? []),
    ...(data.active ?? []),
    ...(data.pre_apply ?? []),
  ];

  return raw.map((item) => ({
    symbol: item.symbol,
    name: item.name,
    status: item.status,
    additionalText: item.additional_text,
    minPrice: item.min_price,
    maxPrice: item.max_price,
    biddingStartDate: item.bidding_start_date,
    biddingEndDate: item.bidding_end_date,
    listingDate: item.listing_date,
    totalSubscriptionRate: item.total_subscription_rate,
  }));
}
