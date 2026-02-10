import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { storeCrawledPages } from '../db/database.js';

/**
 * Crawl a domain and extract page content.
 * Respects robots.txt, depth limits, and page count limits.
 */
export async function crawlDomain(domainId, startUrl, options = {}) {
    const { maxPages = 20, maxDepth = 3 } = options;
    const baseUrl = new URL(startUrl);
    const visited = new Set();
    const queue = [{ url: normalizeUrl(startUrl), depth: 0 }];
    const pages = [];

    // Check robots.txt
    const disallowed = await fetchRobotsTxtDisallowed(baseUrl.origin);

    while (queue.length > 0 && pages.length < maxPages) {
        const { url, depth } = queue.shift();

        if (visited.has(url) || depth > maxDepth) continue;
        visited.add(url);

        // Skip disallowed paths
        const pathname = new URL(url).pathname;
        if (disallowed.some(d => pathname.startsWith(d))) continue;

        try {
            console.log(`[CRAWLER] Fetching (depth ${depth}): ${url}`);
            const response = await fetchWithTimeout(url, 10000);
            if (!response.ok) continue;

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) continue;

            const html = await response.text();
            const $ = cheerio.load(html);

            // Remove scripts, styles, nav, footer for cleaner text
            $('script, style, nav, footer, header, noscript, iframe').remove();

            const title = $('title').text().trim();
            const headings = [];
            $('h1, h2, h3, h4').each((_, el) => {
                const text = $(el).text().trim();
                if (text) headings.push({ tag: el.tagName, text });
            });

            const bodyText = $('main, article, .content, #content, body')
                .first()
                .text()
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 5000); // Limit body text size

            // Extract internal links
            const internalLinks = [];
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                try {
                    const resolved = new URL(href, url);
                    if (resolved.hostname === baseUrl.hostname) {
                        const normalizedLink = normalizeUrl(resolved.href);
                        internalLinks.push(normalizedLink);
                        if (!visited.has(normalizedLink) && depth + 1 <= maxDepth) {
                            queue.push({ url: normalizedLink, depth: depth + 1 });
                        }
                    }
                } catch { /* skip invalid URLs */ }
            });

            // Detect page type
            const pageType = detectPageType(pathname, title, $);

            pages.push({
                id: uuidv4(),
                url,
                title,
                headings,
                bodyText,
                internalLinks: [...new Set(internalLinks)],
                pageType
            });
        } catch (err) {
            console.warn(`[CRAWLER] Error fetching ${url}:`, err.message);
        }
    }

    // Store crawled pages
    storeCrawledPages(domainId, pages);
    console.log(`[CRAWLER] Done. Crawled ${pages.length} pages for domain ${domainId}`);
    return pages;
}

async function fetchRobotsTxtDisallowed(origin) {
    try {
        const resp = await fetchWithTimeout(`${origin}/robots.txt`, 5000);
        if (!resp.ok) return [];
        const text = await resp.text();
        const disallowed = [];
        let isRelevantAgent = false;
        for (const line of text.split('\n')) {
            const trimmed = line.trim().toLowerCase();
            if (trimmed.startsWith('user-agent:')) {
                const agent = trimmed.split(':')[1].trim();
                isRelevantAgent = agent === '*';
            }
            if (isRelevantAgent && trimmed.startsWith('disallow:')) {
                const path = line.split(':').slice(1).join(':').trim();
                if (path) disallowed.push(path);
            }
        }
        return disallowed;
    } catch {
        return [];
    }
}

function detectPageType(pathname, title, $) {
    const path = pathname.toLowerCase();
    const titleLower = (title || '').toLowerCase();

    if (path === '/' || path === '') return 'home';
    if (path.includes('blog') || path.includes('article') || path.includes('news')) return 'blog';
    if (path.includes('category') || path.includes('topics')) return 'category';
    if (path.includes('pricing') || path.includes('plans')) return 'pricing';
    if (path.includes('about') || titleLower.includes('about')) return 'about';
    if (path.includes('signup') || path.includes('register') || path.includes('subscribe')) return 'signup';
    if (path.includes('contact')) return 'contact';
    if (path.includes('product') || path.includes('shop') || path.includes('store')) return 'product';
    return 'other';
}

function normalizeUrl(urlStr) {
    try {
        const u = new URL(urlStr);
        u.hash = '';
        u.search = '';
        let path = u.pathname.replace(/\/+$/, '') || '/';
        u.pathname = path;
        return u.href;
    } catch {
        return urlStr;
    }
}

async function fetchWithTimeout(url, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const resp = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'SMMACrawler/1.0 (Social Media Marketing Agent; +https://smma.dev)',
                'Accept': 'text/html,application/xhtml+xml'
            }
        });
        return resp;
    } finally {
        clearTimeout(timer);
    }
}
