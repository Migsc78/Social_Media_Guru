import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createDomain, getDomain, getAllDomains, updateDomain, deleteDomain } from '../db/database.js';

export const domainRoutes = Router();

// GET /api/domains – list all domains
domainRoutes.get('/', (req, res) => {
    try {
        const domains = getAllDomains();
        res.json(domains);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/domains/:id – get a single domain
domainRoutes.get('/:id', (req, res) => {
    try {
        const domain = getDomain(req.params.id);
        if (!domain) return res.status(404).json({ error: 'Domain not found' });
        res.json(domain);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/domains – create a new domain
domainRoutes.post('/', (req, res) => {
    try {
        const { url, name, primaryGoal, audienceDescription, brandVoiceTone, brandVoiceFormality, brandVoiceExamples, brandVoiceDoNots, socialAccounts } = req.body;
        if (!url || !name) return res.status(400).json({ error: 'url and name are required' });

        const id = uuidv4();
        const domain = createDomain({ id, url, name, primaryGoal, audienceDescription, brandVoiceTone, brandVoiceFormality, brandVoiceExamples, brandVoiceDoNots, socialAccounts });
        res.status(201).json(domain);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Domain URL already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/domains/:id – update a domain
domainRoutes.put('/:id', (req, res) => {
    try {
        const existing = getDomain(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Domain not found' });
        const updated = updateDomain(req.params.id, req.body);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/domains/:id – delete a domain
domainRoutes.delete('/:id', (req, res) => {
    try {
        const existing = getDomain(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Domain not found' });
        deleteDomain(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
