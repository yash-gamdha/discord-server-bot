export interface Env {
  // Secrets — set with `wrangler secret put <NAME>`, never in wrangler.toml
  DISCORD_WEBHOOK_URL: string;
  TRIGGER_SECRET: string;
  FINNHUB_API_KEY: string;
  INDIAN_API_KEY: string;
  EXCHANGE_RATE_API_KEY: string;

  // Non-secret vars — defined in wrangler.toml [vars]
  DIGEST_TITLE: string;
}

export interface NewsItem {
  headline: string;
  url: string;
  source?: string;
}

export interface IpoItem {
  name: string;
  status?: string;
  openDate?: string;
  closeDate?: string;
  priceRange?: string;
}

export interface CurrencyRate {
  pair: string;
  rate: number;
}

export interface DigestData {
  globalNews: NewsItem[];
  indianNews: NewsItem[];
  ipos: IpoItem[];
  currencies: CurrencyRate[];
  errors: string[];
}
