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
const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT = 'LogisticsFlowResearchBot/1.0 (+https://logisticsflow.co.za)';

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

export function normalizeSiteUrl(raw: string): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
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

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml' },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml|application\/xml|text\/xml|text\/plain/i.test(contentType)) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) return null;
    return new TextDecoder('utf-8').decode(buffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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

export function htmlToText(html: string): string {
  const withoutChrome = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<form[\s\S]*?<\/form>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

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

function extractLinks(html: string, origin: string): string[] {
  const links = new Set<string>();
  const regex = /<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], origin);
      if (resolved.origin !== origin) continue;
      if (EXCLUDE_PATTERNS.test(resolved.pathname)) continue;
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
  const urls: string[] = [];
  const regex = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    try {
      const resolved = new URL(match[1]);
      if (resolved.origin === origin && !EXCLUDE_PATTERNS.test(resolved.pathname)) {
        urls.push(resolved.toString());
      }
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

export async function harvestSite(website: string): Promise<HarvestResult> {
  const origin = normalizeSiteUrl(website);
  if (!origin) throw new Error('The stored website address is not a valid URL.');

  const hostname = new URL(origin).hostname;
  await assertPublicHost(hostname);

  const disallowed = await readDisallowedPaths(origin);
  const isAllowed = (url: string) => {
    const path = new URL(url).pathname;
    return !disallowed.some(rule => rule !== '/' && path.startsWith(rule));
  };

  const homeHtml = await fetchText(origin);
  if (!homeHtml) throw new Error('The website could not be reached.');

  const candidates = new Set<string>([`${origin}/`]);
  for (const url of await readSitemap(origin)) candidates.add(url);
  for (const url of extractLinks(homeHtml, origin)) candidates.add(url);

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
  for (const url of ordered) {
    const html = url === `${origin}/` ? homeHtml : await fetchText(url);
    if (!html) continue;
    const text = htmlToText(html);
    if (text.split(/\s+/).filter(Boolean).length < 20) continue;
    pages.push({ url, title: extractTitle(html), text, wordCount: text.split(/\s+/).filter(Boolean).length });
  }

  if (pages.length === 0) throw new Error('No readable page content was found on this website.');

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
