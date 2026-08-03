/**
 * Geo-routing to a localised page.
 *
 * Sends a visitor in Spain to /es, Romania to /ro and Italy to /it; everyone
 * else stays on the English pages at the root.
 *
 * Three rules keep this from doing the damage that IP-based redirection
 * usually does:
 *
 *   1. CRAWLERS ARE NEVER REDIRECTED. Googlebot crawls predominantly from US
 *      addresses, so redirecting it by IP would mean the Spanish, Romanian and
 *      Italian pages are never fetched and never indexed — the site would ship
 *      three languages that no search engine can see. Bots get exactly the URL
 *      they asked for, and the hreflang block on every page tells them the four
 *      versions are one page in four languages.
 *   2. AN EXPLICIT CHOICE WINS FOREVER. The language switcher sets dc-lang, and
 *      a visitor holding that cookie is never redirected again. Someone in
 *      Madrid who wants the English page gets to keep it.
 *   3. IT ONLY EVER FIRES ON A NON-PREFIXED PATH. /es/contact is left alone, so
 *      a shared or bookmarked localised link survives being opened anywhere.
 *
 * Redirects are 307, not 308: the mapping is a per-visitor decision, and a
 * permanent redirect would be cached by the browser and pinned in search
 * engines' link graphs.
 */
export const config = {
  // Everything except assets, the files that must stay at the root, and the
  // locale trees themselves.
  matcher: ['/((?!_vercel|assets|Renders|Fonts|icons|Logo|api|es/|ro/|it/|.*\\.[a-zA-Z0-9]+$).*)'],
};

/** Country -> locale. Countries absent from this map get English. */
const BY_COUNTRY = { ES: 'es', RO: 'ro', IT: 'it' };

const LOCALES = new Set(['en', 'es', 'ro', 'it']);

/**
 * Matches the crawlers that matter for indexing plus the common preview
 * unfurlers, which should also see the URL that was actually shared.
 */
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator|whatsapp|telegram|discord|slack|twitterbot|linkedinbot|applebot|petalbot|yandex|duckduck|baidu|semrush|ahrefs|lighthouse|chrome-lighthouse|gptbot|oai-searchbot|chatgpt-user|perplexitybot|claudebot|anthropic|google-extended|ccbot|bytespider/i;

export default function middleware(request) {
  const url = new URL(request.url);
  const { pathname } = url;

  // Already inside a locale tree, or asking for a root-level file.
  if (LOCALES.has(pathname.split('/')[1])) return;

  const ua = request.headers.get('user-agent') || '';
  if (BOT.test(ua)) return;

  // An explicit choice, once made, is permanent.
  const chosen = request.headers.get('cookie')?.match(/(?:^|;\s*)dc-lang=([a-z]{2})/)?.[1];
  if (chosen) {
    if (chosen === 'en' || !LOCALES.has(chosen)) return;
    return redirect(url, chosen);
  }

  const country = request.headers.get('x-vercel-ip-country')?.toUpperCase();
  const locale = BY_COUNTRY[country];
  if (!locale) return;

  return redirect(url, locale);
}

function redirect(url, locale) {
  const target = new URL(url);
  target.pathname = `/${locale}${url.pathname === '/' ? '' : url.pathname}`;
  return new Response(null, {
    status: 307,
    headers: {
      location: target.toString(),
      // The response varies by both signals, so a shared cache must not serve
      // one visitor's locale to the next.
      vary: 'cookie, x-vercel-ip-country, user-agent',
      'cache-control': 'no-store',
    },
  });
}
