import { Router } from 'express';
import { getDomain, getCrawledPages } from '../db/database.js';
import { crawlDomain } from '../services/crawler.js';

export const crawlRoutes = Router();

// POST /api/domains/:id/crawl – trigger a crawl for a domain
crawlRoutes.post('/domains/:id/crawl', async (req, res) => {
    try {
        const domain = getDomain(req.params.id);
        if (!domain) return res.status(404).json({ error: 'Domain not found' });

        const { maxPages = 20, maxDepth = 3 } = req.body || {};
        const result = await crawlDomain(domain.id, domain.url, { maxPages, maxDepth });
        res.json({ success: true, pagesCrawled: result.length });
    } catch (err) {
        console.error('[CRAWL ERROR]', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/domains/:id/pages – get crawled pages
crawlRoutes.get('/domains/:id/pages', (req, res) => {
    try {
        const domain = getDomain(req.params.id);
        if (!domain) return res.status(404).json({ error: 'Domain not found' });

        const pages = getCrawledPages(req.params.id);
        res.json(pages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
