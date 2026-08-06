import type { DigestData, Env } from "./types";

const EMBED_COLOR = 0x5865f2; // Discord blurple
const MAX_FIELD_LEN = 1024; // Discord embed field value limit

function truncate(text: string, max = MAX_FIELD_LEN): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function formatNewsList(items: DigestData["globalNews"]): string {
  if (items.length === 0) return "_No news fetched._";
  return items.map((n) => `• [${n.headline}](${n.url})`).join("\n");
}

function formatIpoList(items: DigestData["ipos"]): string {
  if (items.length === 0) return "_No IPO data fetched._";
  return items
    .slice(0, 8)
    .map((ipo) => {
      const parts = [ipo.name];
      if (ipo.status) parts.push(`(${ipo.status})`);
      if (ipo.openDate || ipo.closeDate) {
        parts.push(`— ${ipo.openDate ?? "?"} to ${ipo.closeDate ?? "?"}`);
      }
      if (ipo.priceRange) parts.push(`@ ${ipo.priceRange}`);
      return `• ${parts.join(" ")}`;
    })
    .join("\n");
}

function formatCurrencyList(items: DigestData["currencies"]): string {
  if (items.length === 0) return "_No currency data fetched._";
  return items.map((c) => `• ${c.pair}: ${c.rate.toFixed(4)}`).join("\n");
}

export function buildDigestPayload(data: DigestData, title: string) {
  const fields = [
    { name: "🌍 Global Markets", value: truncate(formatNewsList(data.globalNews)) },
    { name: "🇮🇳 Indian Markets", value: truncate(formatNewsList(data.indianNews)) },
    { name: "📈 Upcoming / Active IPOs", value: truncate(formatIpoList(data.ipos)) },
    { name: "💱 Currencies (USD base)", value: truncate(formatCurrencyList(data.currencies)) },
  ];

  if (data.errors.length > 0) {
    fields.push({
      name: "⚠️ Fetch errors",
      value: truncate(data.errors.map((e) => `• ${e}`).join("\n")),
    });
  }

  return {
    username: "Market Digest",
    embeds: [
      {
        title,
        color: EMBED_COLOR,
        timestamp: new Date().toISOString(),
        fields,
        footer: { text: "Weekly digest • data from Finnhub, Indian API, ExchangeRate-API" },
      },
    ],
  };
}

export async function sendDigestToDiscord(env: Env, data: DigestData): Promise<void> {
  const payload = buildDigestPayload(data, env.DIGEST_TITLE || "Weekly Market Digest");

  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord webhook failed: ${res.status} ${body}`);
  }
}
