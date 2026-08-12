import { getGlobalNews } from "./market-digest/sources/finnhub";
import { getIndianNews, getIndianIpos } from "./market-digest/sources/indianMarket";
import { getCurrencyRates } from "./market-digest/sources/currency";
import { sendDigestToDiscord as sendMarketDigestToDiscord } from "./market-digest/discord";
import type { DigestData, Env } from "./market-digest/types";

async function buildDigest(env: Env): Promise<DigestData> {
  const errors: string[] = [];

  const [globalNews, indianNews, ipos, currencies] = await Promise.all([
    getGlobalNews(env).catch((e) => {
      errors.push(`Global news: ${e.message}`);
      return [];
    }),
    getIndianNews(env).catch((e) => {
      errors.push(`Indian news: ${e.message}`);
      return [];
    }),
    getIndianIpos(env).catch((e) => {
      errors.push(`IPOs: ${e.message}`);
      return [];
    }),
    getCurrencyRates(env).catch((e) => {
      errors.push(`Currencies: ${e.message}`);
      return [];
    }),
  ]);

  return { globalNews, indianNews, ipos, currencies, errors };
}

async function runMarketDigest(env: Env, shouldTrigger: boolean): Promise<DigestData> {
  const data = await buildDigest(env);

  if (shouldTrigger) {
    await sendMarketDigestToDiscord(env, data);
  }

  return data;
}

// Constant-time string comparison to avoid leaking the secret via timing.
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

export default {
  // Weekly cron trigger — see wrangler.toml [triggers]
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runMarketDigest(env, true));
  },

  // Manual triggers: POST with prefix: /trigger with header X-Trigger-Secret: <TRIGGER_SECRET>
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (url.pathname !== "/trigger/market-digest") {
      return new Response("Not found", { status: 404 });
    }

    switch (url.pathname) {
      case "/trigger/market-digest":
        return this.marketDigestTrigger(request, url, env)
    }
  },

  async marketDigestTrigger(request: Request, url: URL, env: Env): Promise<Response> {
    if (!(await this.secretVarifier(request, env))) {
      return new Response("Unauthorized", { status: 401 });
    }

    const shouldTrigger = url.searchParams.get("skipTrigger") !== "true"
   
    try {
      const data = await runMarketDigest(env, shouldTrigger);

      const responseContent = shouldTrigger ? 
        {
          counts: {
            globalNews: data.globalNews.length,
            indianNews: data.indianNews.length,
            ipos: data.ipos.length,
            currencies: data.currencies.length,
          }
        }
        : {
          data: {
            globalNews: data.globalNews,
            indianNews: data.indianNews,
            ipos: data.ipos,
            currencies: data.currencies,
          }
        }
          
      return new Response(
        JSON.stringify({
          ok: true,
          errors: data.errors,
          ...responseContent,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  async secretVarifier(request: Request, env: Env): Promise<boolean> {
    const provided = request.headers.get("X-Trigger-Secret") ?? "";

    return !!provided && safeEqual(provided, env.TRIGGER_SECRET);
  }
};
