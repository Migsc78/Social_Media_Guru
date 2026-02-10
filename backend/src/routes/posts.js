import { Router } from 'express';
import { getPostDrafts, getPostDraft, updatePostDraft, bulkUpdatePostStatus, storePostDrafts, getDomain } from '../db/database.js';

export const postRoutes = Router();

// GET /api/domains/:id/posts – get post drafts for a domain
postRoutes.get('/domains/:id/posts', (req, res) => {
    try {
        const domain = getDomain(req.params.id);
        if (!domain) return res.status(404).json({ error: 'Domain not found' });

        const filters = {};
        if (req.query.platform) filters.platform = req.query.platform;
        if (req.query.status) filters.status = req.query.status;
        if (req.query.calendarId) filters.calendarId = req.query.calendarId;

        const posts = getPostDrafts(req.params.id, filters);
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/posts/:id – get a single post draft
postRoutes.get('/posts/:id', (req, res) => {
    try {
        const post = getPostDraft(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post draft not found' });
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/posts/:id – update a post draft
postRoutes.put('/posts/:id', (req, res) => {
    try {
        const post = getPostDraft(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post draft not found' });

        const updated = updatePostDraft(req.params.id, req.body);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/posts/bulk-status – bulk update post statuses
postRoutes.post('/posts/bulk-status', (req, res) => {
    try {
        const { ids, status } = req.body;
        if (!ids || !Array.isArray(ids) || !status) {
            return res.status(400).json({ error: 'ids (array) and status (string) are required' });
        }
        const validStatuses = ['draft', 'approved', 'scheduled', 'published', 'failed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
        }
        bulkUpdatePostStatus(ids, status);
        res.json({ success: true, updated: ids.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/domains/:id/posts – store post drafts
postRoutes.post('/domains/:id/posts', (req, res) => {
    try {
        const domain = getDomain(req.params.id);
        if (!domain) return res.status(404).json({ error: 'Domain not found' });

        const { calendarId, drafts } = req.body;
        if (!drafts || !Array.isArray(drafts)) {
            return res.status(400).json({ error: 'drafts (array) is required' });
        }
        storePostDrafts(req.params.id, calendarId || null, drafts);
        res.status(201).json({ success: true, stored: drafts.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
