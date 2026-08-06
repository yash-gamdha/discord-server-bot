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

  const data = (await res.json()) as any;

  // The /ipo endpoint has returned a few different shapes historically
  // (a flat array, or an object keyed by status like `upcoming`/`active`).
  // Normalize defensively rather than assuming one exact shape.
  const raw: any[] = Array.isArray(data)
    ? data
    : [
        ...(data.upcoming ?? []),
        ...(data.active ?? []),
        ...(data.ongoing ?? []),
      ];

  return raw.map((item) => ({
    name: item.name ?? item.companyName ?? item.company_name ?? "Unknown IPO",
    status: item.status ?? item.ipo_status,
    openDate: item.openDate ?? item.open_date ?? item.bidding_start_date,
    closeDate: item.closeDate ?? item.close_date ?? item.bidding_end_date,
    priceRange: item.priceRange ?? item.price_range ?? item.issue_price,
  }));
}
