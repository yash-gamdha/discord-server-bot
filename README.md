# Discord Server Automation Bot

A Cloudflare Worker that fetches various things from various sources and posts them to different channels in a Discord server. It runs on a cron trigger (every Monday 08:00 IST) and also exposes a secret-protected HTTP endpoint you can call manually.

No server to maintain — everything runs on Cloudflare's free tier.

## 1. Sign up for API keys (all free)

| Service | What it's for | Sign up |
|---|---|---|
| Finnhub | Global market news | https://finnhub.io/register (free key, 60 calls/min) |
| Indian API | NSE/BSE news + IPOs | https://indianapi.in (free tier, key from dashboard) |
| ExchangeRate-API | Currency rates | https://www.exchangerate-api.com (free key, 1500 req/month) |

Also grab your Discord webhook URL: in your server, go to
**Channel Settings → Integrations → Webhooks → New Webhook**, copy the URL.

## 2. Install dependencies

```bash
npm install
```

This also installs `wrangler`, Cloudflare's CLI — no separate install needed.

## 3. Log in to Cloudflare

```bash
npx wrangler login
```

Free Cloudflare account is enough — no credit card required for Workers free tier.

## 4. Set secrets

Run each of these — they'll prompt you to paste the value (never committed to the repo):

```bash
npx wrangler secret put DISCORD_WEBHOOK_URL
npx wrangler secret put TRIGGER_SECRET       # any random string you choose, e.g. `openssl rand -hex 32`
npx wrangler secret put FINNHUB_API_KEY
npx wrangler secret put INDIAN_API_KEY
npx wrangler secret put EXCHANGE_RATE_API_KEY
```

## 5. Deploy

```bash
npm run deploy
```

This prints your Worker's URL, e.g. `https://discord-server-automation-bot.<your-subdomain>.workers.dev`.

## 6. Trigger it manually (the HTTP endpoint you asked for)

```bash
curl -X POST https://discord-server-automation-bot.<your-subdomain>.workers.dev/trigger \
  -H "X-Trigger-Secret: <the TRIGGER_SECRET you set above>"
```

Returns JSON with a count of items fetched from each source and any
per-source errors (a single failing API won't block the others — the
digest still sends with whatever data it got).

## 7. It also runs automatically

The cron schedule lives in `wrangler.toml`:

```toml
[triggers]
crons = ["30 2 * * 1"]   # Monday 02:30 UTC = 08:00 IST
```

Change the cron expression and redeploy (`npm run deploy`) if you want a
different day/time.

## Local development

```bash
cp .dev.vars.example .dev.vars   # fill in real values, this file is gitignored
npm run dev
```

Then hit `http://localhost:8787/trigger` with the header above. Note: local
dev doesn't trigger the cron — use the HTTP endpoint to test.

## Notes / things to keep an eye on

- **Indian API response shapes**: their `/news` and `/ipo` endpoints have
  evolved over time and the docs aren't fully pinned down. `indianMarket.ts`
  maps a few plausible field names defensively. If Discord shows blank/odd
  IPO entries, run `wrangler tail` while hitting `/trigger` and check the raw
  JSON, then adjust the field mapping.
- **Free tier limits**: Finnhub (60/min), ExchangeRate-API (1500/month),
  Indian API (check your plan) — a once-a-week run uses basically none of
  this, so you have headroom to also call `/trigger` manually or add more
  sources later.
- **Commercial use**: Finnhub's free tier is for non-commercial personal
  use — fine here since this is a personal Discord server digest.
