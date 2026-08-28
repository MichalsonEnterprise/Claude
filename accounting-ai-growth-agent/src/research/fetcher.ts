import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { createHash } from 'node:crypto';
import { logger } from '../logger.js';
import type { SourceDefinition } from './sources.js';

export interface FetchedItem {
  title: string;
  url: string;
  publishedAt: Date | null;
  rawSummary: string;
  contentHash: string;
}

const rssParser = new Parser({ timeout: 15000 });

export function contentHashFor(url: string, title: string): string {
  return createHash('sha256').update(`${url}|${title}`).digest('hex');
}

export async function fetchSource(source: SourceDefinition): Promise<FetchedItem[]> {
  try {
    if (source.kind === 'RSS') {
      return await fetchRss(source);
    }
    if (source.kind === 'HTML') {
      return await fetchHtml(source);
    }
    logger.warn('Unsupported source kind, skipping', { source: source.name, kind: source.kind });
    return [];
  } catch (err) {
    logger.error('Source fetch failed', { source: source.name, url: source.url, error: (err as Error).message });
    return [];
  }
}

async function fetchRss(source: SourceDefinition): Promise<FetchedItem[]> {
  const feed = await rssParser.parseURL(source.url);
  return (feed.items || []).map((item) => {
    const title = item.title?.trim() || '(untitled)';
    const url = item.link?.trim() || source.url;
    const rawSummary = (item.contentSnippet || item.content || '').trim().slice(0, 2000);
    const publishedAt = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null;
    return {
      title,
      url,
      publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : null,
      rawSummary,
      contentHash: contentHashFor(url, title),
    };
  });
}

/**
 * Minimal HTML fallback: fetch a public page and extract headline-like text.
 * Deliberately not a general crawler — one page, one pass, text extraction
 * only (no JS execution, no link-following).
 */
async function fetchHtml(source: SourceDefinition): Promise<FetchedItem[]> {
  const res = await fetch(source.url, { headers: { 'User-Agent': 'accounting-ai-growth-agent/0.1 (research bot)' } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${source.url}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const items: FetchedItem[] = [];
  $('article, .news-item, li a, h2 a, h3 a').each((_, el) => {
    const $el = $(el);
    const title = $el.text().trim();
    const href = $el.attr('href') || $el.find('a').first().attr('href');
    if (!title || title.length < 12 || !href) return;
    const url = href.startsWith('http') ? href : new URL(href, source.url).toString();
    items.push({
      title: title.slice(0, 300),
      url,
      publishedAt: null,
      rawSummary: '',
      contentHash: contentHashFor(url, title),
    });
  });

  // Dedup within a single page fetch and cap volume — this is a
  // lightweight fallback, not a crawler.
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.contentHash) ? false : (seen.add(i.contentHash), true))).slice(0, 30);
}
