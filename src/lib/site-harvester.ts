import { promises as dns } from 'dns';
import net from 'net';

export interface HarvestedPage {
  url: string;
  title: string;
  text: string;
  wordCount: number;
}

export interface HarvestResult {
  pages: HarvestedPage[];
  totalWords: number;
  discovered: number;
  skipped: string[];
  harvestedAt: string;
}

const MAX_PAGES = 12;
const MAX_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 25_000;
const USER_AGENT = 'LogisticsFlowResearchBot/1.0 (+https://logisticsflow.co.za)';
// Some hosts serve a near-empty shell or a challenge page to unknown bots. When the
// polite bot identity yields nothing readable we retry once as a normal browser.
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MIN_PAGE_WORDS = 20;
const MAX_REDIRECTS = 6;

// Pages carrying the service wording we index on, in priority order.
const PRIORITY_PATTERNS = [
  /^\/?$/,
  /about/i,
  /service/i,
  /product/i,
  /solution/i,
  /capabilit/i,
  /what-we-do/i,
  /industr/i,
  /fleet/i,
  /company/i,
];

const EXCLUDE_PATTERNS = /\.(pdf|jpe?g|png|gif|svg|webp|zip|docx?|xlsx?|mp4|mp3|css|js)(\?|$)/i;
const NON_WEBSITE_HOSTS = [
  'google.',
  'bing.com',
  'facebook.com',
  'linkedin.com',
  'instagram.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
];

function extractUrlFromSearchResult(url: URL): string | null {
  for (const key of ['url', 'u', 'q']) {
    const value = url.searchParams.get(key);
    if (value && /^https?:\/\//i.test(value)) return value;
  }
  return null;
}

export function normalizeSiteUrl(raw: string): string | null {
  const value = String(raw || '')
    .trim()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^<|>$/g, '');
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`;
  try {
    let url = new URL(candidate);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');

    if (NON_WEBSITE_HOSTS.some(host => hostname.includes(host))) {
      const extracted = extractUrlFromSearchResult(url);
      if (!extracted) return null;
      url = new URL(extracted);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  const lower = address.toLowerCase();
  return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
}

// Blocks SSRF into internal infrastructure before any request is made.
async function assertPublicHost(hostname: string): Promise<void> {
  if (['localhost', 'metadata.google.internal'].includes(hostname.toLowerCase())) {
    throw new Error('Refusing to fetch an internal host.');
  }
  const records = await dns.lookup(hostname, { all: true });
  if (!records.length) throw new Error('Host could not be resolved.');
  if (records.some(record => isPrivateAddress(record.address))) {
    throw new Error('Refusing to fetch a host that resolves to a private address.');
  }
}

interface FetchOutcome {
  html: string;
  finalUrl: string;
}

export interface FetchTrace {
  url: string;
  status: number | string;
  contentType?: string;
  bytes?: number;
  location?: string;
  note?: string;
}

// Redirects are followed by hand because some hosts answer the apex with a
// protocol-downgrading 301 (https -> http -> https) that the runtime fetch may
// refuse, leaving us holding the tiny "Moved Permanently" stub body instead of
// the real page. Tracking the final URL also tells us where the site truly lives.
async function fetchPage(
  url: string,
  userAgent: string = USER_AGENT,
  trace?: FetchTrace[],
): Promise<FetchOutcome | null> {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(current, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-ZA,en;q=0.9',
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        trace?.push({ url: current, status: response.status, location: location || '(none)' });
        if (!location) return null;
        const next = new URL(location, current);
        if (next.protocol !== 'http:' && next.protocol !== 'https:') return null;
        await assertPublicHost(next.hostname);
        current = next.toString();
        continue;
      }

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        trace?.push({ url: current, status: response.status, contentType, note: 'not ok' });
        return null;
      }
      if (contentType && !/text\/html|application\/xhtml|application\/xml|text\/xml|text\/plain/i.test(contentType)) {
        trace?.push({ url: current, status: response.status, contentType, note: 'rejected content-type' });
        return null;
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_BYTES) {
        trace?.push({ url: current, status: response.status, contentType, bytes: buffer.byteLength, note: 'too large' });
        return null;
      }
      const html = new TextDecoder('utf-8').decode(buffer);
      trace?.push({
        url: current,
        status: response.status,
        contentType,
        bytes: buffer.byteLength,
        note: `${wordCountOf(bestTextFor(html))} words`,
      });
      return { html, finalUrl: response.url || current };
    } catch (error: any) {
      trace?.push({ url: current, status: 'fetch error', note: error?.message || String(error) });
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  trace?.push({ url: current, status: 'too many redirects' });
  return null;
}

async function fetchText(url: string, userAgent: string = USER_AGENT): Promise<string | null> {
  const outcome = await fetchPage(url, userAgent);
  return outcome ? outcome.html : null;
}

// Falls back to metadata and structured data when the visible body is empty,
// which is the normal shape of a JavaScript-rendered single page application.
function extractFallbackText(html: string): string {
  const parts: string[] = [];

  const title = extractTitle(html);
  if (title) parts.push(title);

  const metaRegex = /<meta\s[^>]*>/gi;
  let meta: RegExpExecArray | null;
  while ((meta = metaRegex.exec(html)) !== null) {
    const tag = meta[0];
    const nameMatch = tag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (!nameMatch || !contentMatch) continue;
    if (!/description|og:title|og:description|og:site_name|keywords|twitter:(title|description)/i.test(nameMatch[1])) {
      continue;
    }
    const value = decodeEntities(contentMatch[1]).trim();
    if (value) parts.push(value);
  }

  const ldRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ld: RegExpExecArray | null;
  while ((ld = ldRegex.exec(html)) !== null) {
    const values: string[] = [];
    const collect = (node: any) => {
      if (!node) return;
      if (typeof node === 'string') { values.push(node); return; }
      if (Array.isArray(node)) { node.forEach(collect); return; }
      if (typeof node === 'object') Object.values(node).forEach(collect);
    };
    try { collect(JSON.parse(ld[1])); } catch { /* Ignore malformed JSON-LD. */ }
    parts.push(...values.filter(value => value.length > 1 && !/^https?:\/\//i.test(value)));
  }

  return Array.from(new Set(parts.map(part => part.trim()).filter(Boolean))).join('\n');
}

function wordCountOf(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// Progressively less aggressive extraction: chrome-stripped body, then the raw
// body (for sites whose copy lives inside header/footer), then page metadata.
function bestTextFor(html: string): string {
  const stripped = htmlToText(html);
  if (wordCountOf(stripped) >= MIN_PAGE_WORDS) return stripped;

  const raw = htmlToText(html, { keepChrome: true });
  if (wordCountOf(raw) >= MIN_PAGE_WORDS) return raw;

  const fallback = extractFallbackText(html);
  const best = [stripped, raw, fallback].sort((a, b) => wordCountOf(b) - wordCountOf(a))[0];
  return best || '';
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).trim().slice(0, 200) : '';
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function htmlToText(html: string, options: { keepChrome?: boolean } = {}): string {
  let withoutChrome = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  if (!options.keepChrome) {
    withoutChrome = withoutChrome
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<form[\s\S]*?<\/form>/gi, ' ');
  }

  return decodeEntities(
    withoutChrome
      .replace(/<\/(p|div|section|article|li|h[1-6]|br|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function extractLinks(html: string, base: string): string[] {
  const links = new Set<string>();
  const baseHost = new URL(base).hostname.toLowerCase().replace(/^www\./, '');
  const baseProtocol = new URL(base).protocol;
  const regex = /<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], base);
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') continue;
      // Sites routinely mix http/https and www/apex in their own markup, so the
      // host is compared loosely and the link is pulled back onto our scheme.
      if (resolved.hostname.toLowerCase().replace(/^www\./, '') !== baseHost) continue;
      if (EXCLUDE_PATTERNS.test(resolved.pathname)) continue;
      resolved.protocol = baseProtocol;
      resolved.hash = '';
      links.add(resolved.toString());
    } catch {
      // Ignore malformed hrefs.
    }
  }
  return Array.from(links);
}

async function readSitemap(origin: string): Promise<string[]> {
  const xml = await fetchText(`${origin}/sitemap.xml`);
  if (!xml) return [];
  const originHost = new URL(origin).hostname.toLowerCase().replace(/^www\./, '');
  const originProtocol = new URL(origin).protocol;
  const urls: string[] = [];
  const regex = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    try {
      const resolved = new URL(match[1]);
      if (resolved.hostname.toLowerCase().replace(/^www\./, '') !== originHost) continue;
      if (EXCLUDE_PATTERNS.test(resolved.pathname)) continue;
      resolved.protocol = originProtocol;
      urls.push(resolved.toString());
    } catch {
      // Ignore malformed sitemap entries.
    }
  }
  return urls;
}

async function readDisallowedPaths(origin: string): Promise<string[]> {
  const robots = await fetchText(`${origin}/robots.txt`);
  if (!robots) return [];

  const disallowed: string[] = [];
  let appliesToUs = false;
  for (const line of robots.split('\n')) {
    const clean = line.split('#')[0].trim();
    if (!clean) continue;
    const [rawKey, ...rest] = clean.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') appliesToUs = value === '*';
    else if (key === 'disallow' && appliesToUs && value) disallowed.push(value);
  }
  return disallowed;
}

function priorityScore(url: string): number {
  const path = new URL(url).pathname.replace(/\/+$/, '') || '/';
  const index = PRIORITY_PATTERNS.findIndex(pattern => pattern.test(path === '/' ? '' : path));
  return index === -1 ? PRIORITY_PATTERNS.length : index;
}

// Surfaced in the failure toast so a harvest that behaves differently on the
// server than on a desktop browser can be diagnosed without guesswork.
function formatTrace(trace: FetchTrace[]): string {
  if (!trace.length) return '';
  const lines = trace.slice(0, 8).map(entry => {
    const parts = [`${entry.status}`];
    if (entry.location) parts.push(`-> ${entry.location}`);
    if (entry.contentType) parts.push(entry.contentType.split(';')[0]);
    if (typeof entry.bytes === 'number') parts.push(`${entry.bytes}b`);
    if (entry.note) parts.push(entry.note);
    return `${entry.url} [${parts.join(', ')}]`;
  });
  return `Server trace: ${lines.join(' | ')}`;
}

export async function harvestSite(website: string): Promise<HarvestResult> {
  const origin = normalizeSiteUrl(website);
  if (!origin) throw new Error('The stored website address is not a valid URL.');

  const hostname = new URL(origin).hostname;
  await assertPublicHost(hostname);

  // Some hosts only answer on one of the apex/www variants, or block our bot identity.
  const originVariants = [origin];
  const altOrigin = hostname.startsWith('www.')
    ? origin.replace('://www.', '://')
    : origin.replace('://', '://www.');
  if (altOrigin !== origin) originVariants.push(altOrigin);

  let activeOrigin = '';
  let activeAgent = USER_AGENT;
  let homeHtml: string | null = null;
  let landingUrl = '';
  const trace: FetchTrace[] = [];

  outer: for (const agent of [USER_AGENT, BROWSER_USER_AGENT]) {
    for (const candidate of originVariants) {
      const outcome = await fetchPage(candidate, agent, trace);
      if (outcome && wordCountOf(bestTextFor(outcome.html)) >= MIN_PAGE_WORDS) {
        activeOrigin = candidate;
        activeAgent = agent;
        homeHtml = outcome.html;
        landingUrl = outcome.finalUrl;
        break outer;
      }
      // Remember any reachable response so the error can distinguish
      // "unreachable" from "reachable but empty".
      if (outcome && !homeHtml) {
        activeOrigin = candidate;
        activeAgent = agent;
        homeHtml = outcome.html;
        landingUrl = outcome.finalUrl;
      }
    }
  }

  if (!homeHtml) {
    throw new Error(
      `The website could not be reached. It may be offline, blocking automated access, or the address may be wrong. ${formatTrace(trace)}`,
    );
  }
  if (!activeOrigin) activeOrigin = origin;

  // The apex often redirects into a subdirectory (for example /new/), so the
  // crawl is anchored on where we actually landed rather than the bare origin.
  let landing: URL;
  try {
    landing = new URL(landingUrl || activeOrigin);
  } catch {
    landing = new URL(activeOrigin);
  }
  const crawlOrigin = landing.origin;
  const homeUrl = landing.toString();

  const disallowed = await readDisallowedPaths(crawlOrigin);
  const isAllowed = (url: string) => {
    const path = new URL(url).pathname;
    return !disallowed.some(rule => rule !== '/' && path.startsWith(rule));
  };

  const candidates = new Set<string>([homeUrl]);
  for (const url of await readSitemap(crawlOrigin)) candidates.add(url);
  for (const url of extractLinks(homeHtml, homeUrl)) candidates.add(url);

  const skipped: string[] = [];
  const ordered = Array.from(candidates)
    .filter(url => {
      if (isAllowed(url)) return true;
      skipped.push(url);
      return false;
    })
    .sort((a, b) => priorityScore(a) - priorityScore(b))
    .slice(0, MAX_PAGES);

  const pages: HarvestedPage[] = [];
  let reachedPages = 0;
  for (const url of ordered) {
    const html = url === homeUrl ? homeHtml : await fetchText(url, activeAgent);
    if (!html) continue;
    reachedPages += 1;
    const text = bestTextFor(html);
    const wordCount = wordCountOf(text);
    if (wordCount < MIN_PAGE_WORDS) continue;
    pages.push({ url, title: extractTitle(html), text, wordCount });
  }

  if (pages.length === 0) {
    const reason = reachedPages > 0
      ? `Reached ${reachedPages} page${reachedPages === 1 ? '' : 's'} on ${crawlOrigin}, but they returned no readable text. Use the "Paste website text" option to supply the copy manually.`
      : `No page on ${crawlOrigin} returned readable content. The site may be blocking automated access.`;
    throw new Error(`${reason} ${formatTrace(trace)}`);
  }

  return {
    pages,
    totalWords: pages.reduce((sum, page) => sum + page.wordCount, 0),
    discovered: candidates.size,
    skipped,
    harvestedAt: new Date().toISOString(),
  };
}

export function buildSearchCorpus(pages: HarvestedPage[]): string {
  return pages
    .map(page => page.text)
    .join('\n\n')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50_000);
}
