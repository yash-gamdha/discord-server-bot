import type { CurrencyRate, Env } from "../types";

// ExchangeRate-API (https://www.exchangerate-api.com) v6, free tier.
// GET /v6/API_KEY/latest/USD
const PAIRS_OF_INTEREST = ["INR", "EUR", "GBP", "JPY"];

export async function getCurrencyRates(env: Env): Promise<CurrencyRate[]> {
  const url = `https://v6.exchangerate-api.com/v6/${env.EXCHANGE_RATE_API_KEY}/latest/USD`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`ExchangeRate-API failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    result: string;
    conversion_rates: Record<string, number>;
  };

  if (data.result !== "success") {
    throw new Error("ExchangeRate-API returned a non-success result");
  }

  return PAIRS_OF_INTEREST.filter((code) => data.conversion_rates[code] !== undefined).map(
    (code) => ({
      pair: `USD/${code}`,
      rate: data.conversion_rates[code],
    })
  );
}
