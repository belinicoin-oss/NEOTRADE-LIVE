// Server-side proxy for crypto spot prices used by the homepage hero ticker.
// Browsers cannot call api.coingecko.com directly (no CORS headers on the
// free public endpoint), so we fetch server-side and return the small JSON
// shape the ticker consumes. Cached for 15s to stay well under CoinGecko's
// free-tier rate limit.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let _cache = { at: 0, body: null };

export async function GET() {
  const now = Date.now();
  if (_cache.body && now - _cache.at < 15_000) {
    return Response.json(_cache.body);
  }

  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true',
      { cache: 'no-store' }
    );
    if (!r.ok) {
      return Response.json(_cache.body || {}, { status: 200 });
    }
    const j = await r.json();
    const body = {
      'BTC/USD': { price: j?.bitcoin?.usd ?? null, change: j?.bitcoin?.usd_24h_change ?? 0 },
      'ETH/USD': { price: j?.ethereum?.usd ?? null, change: j?.ethereum?.usd_24h_change ?? 0 },
      'SOL/USD': { price: j?.solana?.usd ?? null, change: j?.solana?.usd_24h_change ?? 0 },
    };
    _cache = { at: now, body };
    return Response.json(body);
  } catch (_) {
    return Response.json(_cache.body || {}, { status: 200 });
  }
}
