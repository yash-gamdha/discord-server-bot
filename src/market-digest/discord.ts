import type { DigestData, Env } from "./types";

const EMBED_COLOR = 0x5865f2; // Discord blurple
const MAX_FIELD_LENGTH = 1024; // Discord embed field value limit
const MAX_HEADLINE_LENGTH = 100;


function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function joinWithinBudget(lines: string[], max = MAX_FIELD_LENGTH): string {
  const out: string[] = [];
  let total = 0;
  for (const line of lines) {
    const addedLength = line.length + (out.length > 0 ? 1 : 0); // +1 for the \n
    if (total + addedLength > max) break;
    out.push(line);
    total += addedLength;
  }
  return out.join("\n");
}

function formatNewsList(items: DigestData["globalNews"]): string {
  if (items.length === 0) return "_No news fetched._";
  const lines = items.map(
    (n) => `• [${truncate(n.headline, MAX_HEADLINE_LENGTH)}](${n.url})`
  );
  return joinWithinBudget(lines);
}

function formatIpoList(items: DigestData["ipos"]): string {
  if (items.length === 0) return "_No IPO data fetched._";

  const byStatus = (status: string) =>
    items.filter((ipo) => ipo.status === status).slice(0, 4);

  const selected = [
    ...byStatus("upcoming"),
    ...byStatus("active"),
    ...byStatus("pre_apply"),
  ];

  if (selected.length === 0) return "_No IPO data fetched._";

  const lines = selected.map((ipo) => {
    const parts = [ipo.name, `(${ipo.status})`];

    // additionalText is already a human-readable status message from the
    // API (e.g. "Closes on 17 Aug at 3:50 PM"), so prefer it over raw dates.
    if (ipo.additionalText) {
      parts.push(`— ${ipo.additionalText}`);
    } else if (ipo.biddingStartDate || ipo.biddingEndDate) {
      parts.push(
        `— ${ipo.biddingStartDate ?? "?"} to ${ipo.biddingEndDate ?? "?"}`,
      );
    }

    if (ipo.minPrice && ipo.maxPrice) {
      parts.push(`@ ₹${ipo.minPrice}-${ipo.maxPrice}`);
    }

    if (ipo.status === "active" && ipo.totalSubscriptionRate != null) {
      parts.push(`(${ipo.totalSubscriptionRate.toFixed(1)}x subscribed)`);
    }

    return `• ${parts.join(" ")}`;
  });

  return joinWithinBudget(lines);
}

function formatCurrencyList(items: DigestData["currencies"]): string {
  if (items.length === 0) return "_No currency data fetched._";
  const lines = items.map((c) => `• ${c.pair}: ${c.rate.toFixed(4)}`);
  return joinWithinBudget(lines);
}

export function buildDigestPayload(data: DigestData, title: string) {
  const fields = [
    { name: "🌍 Global Markets", value: formatNewsList(data.globalNews) },
    { name: "🇮🇳 Indian Markets", value: formatNewsList(data.indianNews) },
    { name: "📈 Upcoming / Active IPOs", value: formatIpoList(data.ipos) },
    { name: "💱 Currencies (USD base)", value: formatCurrencyList(data.currencies) },
  ];

  if (data.errors.length > 0) {
    fields.push({
      name: "⚠️ Fetch errors",
      value: truncate(data.errors.map((e) => `• ${e}`).join("\n"), MAX_FIELD_LENGTH),
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
  const payload = buildDigestPayload(data, "Weekly Market Digest");

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
