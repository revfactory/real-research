import type { SourceType } from '@/types';
import type { SourceInfo } from './types';
import { extractDomain } from './url-utils';

/** Domain authority tiers */
const AUTHORITY_TIERS: Record<string, number> = {
  // Government / Education → highest
  '.gov': 1.0,
  '.edu': 1.0,
  '.ac.kr': 1.0,
  '.go.kr': 1.0,
  '.or.kr': 0.9,
  // Major news / research
  'reuters.com': 0.85,
  'apnews.com': 0.85,
  'nature.com': 0.9,
  'sciencedirect.com': 0.9,
  'arxiv.org': 0.85,
  'pubmed.ncbi.nlm.nih.gov': 0.9,
  'nytimes.com': 0.8,
  'washingtonpost.com': 0.8,
  'bbc.com': 0.8,
  'bbc.co.uk': 0.8,
  'economist.com': 0.8,
  'ft.com': 0.8,
  'bloomberg.com': 0.8,
  'wsj.com': 0.8,
  'techcrunch.com': 0.75,
  'theverge.com': 0.7,
  'arstechnica.com': 0.75,
  'wired.com': 0.7,
  // Korean major media
  'chosun.com': 0.75,
  'donga.com': 0.75,
  'hani.co.kr': 0.75,
  'khan.co.kr': 0.75,
  'mk.co.kr': 0.7,
  'hankyung.com': 0.7,
  'yna.co.kr': 0.8,
  // Wikipedia / reference
  'wikipedia.org': 0.6,
  'namu.wiki': 0.4,
  // Blogs / user-generated
  'medium.com': 0.4,
  'tistory.com': 0.35,
  'velog.io': 0.35,
  'brunch.co.kr': 0.4,
  'blog.naver.com': 0.3,
  'reddit.com': 0.3,
};

/**
 * Get domain authority score (0-1)
 */
function getDomainAuthority(url: string): number {
  const domain = extractDomain(url);

  // Check exact domain match
  if (AUTHORITY_TIERS[domain] !== undefined) return AUTHORITY_TIERS[domain];

  // Check suffix match (.gov, .edu, etc.)
  for (const [suffix, score] of Object.entries(AUTHORITY_TIERS)) {
    if (suffix.startsWith('.') && domain.endsWith(suffix)) return score;
  }

  // Check if parent domain matches
  const parts = domain.split('.');
  if (parts.length > 2) {
    const parentDomain = parts.slice(-2).join('.');
    if (AUTHORITY_TIERS[parentDomain] !== undefined) return AUTHORITY_TIERS[parentDomain];
  }

  // Default score for unknown domains
  return 0.5;
}

/**
 * Estimate freshness score from pageAge string (0-1)
 * Formats: "2 days ago", "3 weeks ago", "1 month ago", "2024-01-15"
 */
function getFreshnessScore(pageAge?: string): number {
  if (!pageAge) return 0.5; // Unknown age → neutral score

  const lower = pageAge.toLowerCase();

  // "X days ago" format
  const daysMatch = lower.match(/(\d+)\s*day/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    if (days <= 7) return 1.0;
    if (days <= 30) return 0.8;
    return 0.6;
  }

  // "X weeks ago" format
  const weeksMatch = lower.match(/(\d+)\s*week/);
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1]);
    if (weeks <= 2) return 0.9;
    if (weeks <= 4) return 0.7;
    return 0.5;
  }

  // "X months ago" format
  const monthsMatch = lower.match(/(\d+)\s*month/);
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1]);
    if (months <= 3) return 0.7;
    if (months <= 6) return 0.5;
    if (months <= 12) return 0.3;
    return 0.2;
  }

  // "X years ago" format
  const yearsMatch = lower.match(/(\d+)\s*year/);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1]);
    if (years <= 1) return 0.3;
    return 0.1;
  }

  // ISO date format
  const dateMatch = lower.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const date = new Date(dateMatch[0]);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 7) return 1.0;
    if (daysDiff <= 30) return 0.8;
    if (daysDiff <= 90) return 0.7;
    if (daysDiff <= 365) return 0.4;
    return 0.2;
  }

  return 0.5;
}

/**
 * Auto-classify source type based on URL domain
 */
export function classifySourceType(url: string): SourceType {
  const domain = extractDomain(url);

  // Academic
  if (
    domain.endsWith('.edu') || domain.endsWith('.ac.kr') ||
    domain.includes('arxiv.org') || domain.includes('pubmed') ||
    domain.includes('scholar.google') || domain.includes('sciencedirect') ||
    domain.includes('nature.com') || domain.includes('springer.com') ||
    domain.includes('ieee.org') || domain.includes('acm.org')
  ) {
    return 'academic';
  }

  // Official / Government
  if (
    domain.endsWith('.gov') || domain.endsWith('.go.kr') ||
    domain.endsWith('.or.kr') || domain.endsWith('.org')
  ) {
    return 'official';
  }

  // News
  const newsDomains = [
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
    'nytimes.com', 'washingtonpost.com', 'bloomberg.com', 'wsj.com',
    'ft.com', 'economist.com', 'techcrunch.com', 'theverge.com',
    'arstechnica.com', 'wired.com', 'cnn.com', 'cnbc.com',
    'chosun.com', 'donga.com', 'hani.co.kr', 'khan.co.kr',
    'mk.co.kr', 'hankyung.com', 'yna.co.kr', 'yonhapnews.co.kr',
  ];
  if (newsDomains.some(nd => domain === nd || domain.endsWith('.' + nd))) {
    return 'news';
  }

  // Blog
  const blogDomains = [
    'medium.com', 'tistory.com', 'velog.io', 'brunch.co.kr',
    'blog.naver.com', 'wordpress.com', 'substack.com', 'dev.to',
    'namu.wiki', 'wikipedia.org',
  ];
  if (blogDomains.some(bd => domain === bd || domain.endsWith('.' + bd) || domain.includes(bd))) {
    return 'blog';
  }

  return 'other';
}

/**
 * Score a single source for reliability.
 * Returns a score between 0 and 1.
 */
export function scoreSource(
  source: SourceInfo,
  crossValidatedUrls: Set<string>,
): { reliabilityScore: number; sourceType: SourceType } {
  const domainAuth = getDomainAuthority(source.url);
  const freshness = getFreshnessScore(source.pageAge);
  const crossValidated = crossValidatedUrls.has(source.url) ? 0.15 : 0;
  const sourceType = source.sourceType || classifySourceType(source.url);

  // Weighted combination
  const reliabilityScore = Math.min(1, domainAuth * 0.5 + freshness * 0.3 + crossValidated + 0.05);

  return { reliabilityScore, sourceType };
}

/**
 * Score and enrich all sources, filter out low-quality ones.
 * Returns filtered + enriched sources.
 */
export function scoreAndFilterSources(
  sources: SourceInfo[],
  crossValidatedUrls: Set<string>,
  minScore = 0.2,
): SourceInfo[] {
  return sources
    .map(source => {
      const { reliabilityScore, sourceType } = scoreSource(source, crossValidatedUrls);
      return {
        ...source,
        reliabilityScore,
        sourceType,
      };
    })
    .filter(source => (source.reliabilityScore ?? 0) >= minScore);
}
