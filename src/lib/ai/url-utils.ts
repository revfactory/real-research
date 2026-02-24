const UTM_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_source_platform', 'utm_creative_format',
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid',
  'mc_cid', 'mc_eid', 'ref', 'referer',
]);

/**
 * Normalize a URL for consistent deduplication:
 * - Remove UTM and tracking parameters
 * - Remove trailing slashes
 * - Normalize protocol to https
 * - Lowercase hostname
 * - Remove fragment
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);

    // Normalize to https
    url.protocol = 'https:';

    // Lowercase hostname
    url.hostname = url.hostname.toLowerCase();

    // Remove tracking params
    for (const param of [...url.searchParams.keys()]) {
      if (UTM_PARAMS.has(param.toLowerCase())) {
        url.searchParams.delete(param);
      }
    }

    // Sort remaining params for consistency
    url.searchParams.sort();

    // Remove fragment
    url.hash = '';

    // Build clean URL and remove trailing slash (except root)
    let normalized = url.toString();
    if (normalized.endsWith('/') && url.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    // If URL parsing fails, return as-is
    return rawUrl;
  }
}

/**
 * Extract the domain from a URL (e.g., "www.example.com" → "example.com")
 */
export function extractDomain(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return rawUrl;
  }
}
