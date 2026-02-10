import { Router } from 'express';
import { storeAgentData, getAgentData, getDomain } from '../db/database.js';

export const agentIORoutes = Router();

const VALID_TABLES = ['domain_profiles', 'competitor_sets', 'positioning_summaries', 'content_strategies', 'campaign_calendars'];

// GET /api/agent/:dataType/:domainId – retrieve agent data
agentIORoutes.get('/:dataType/:domainId', (req, res) => {
    try {
        const { dataType, domainId } = req.params;
        if (!VALID_TABLES.includes(dataType)) {
            return res.status(400).json({ error: `Invalid data type. Must be one of: ${VALID_TABLES.join(', ')}` });
        }
        const domain = getDomain(domainId);
        if (!domain) return res.status(404).json({ error: 'Domain not found' });

        const data = getAgentData(dataType, domainId);
        res.json(data || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/agent/:dataType/:domainId – store agent data
agentIORoutes.post('/:dataType/:domainId', (req, res) => {
    try {
        const { dataType, domainId } = req.params;
        if (!VALID_TABLES.includes(dataType)) {
            return res.status(400).json({ error: `Invalid data type. Must be one of: ${VALID_TABLES.join(', ')}` });
        }
        const domain = getDomain(domainId);
        if (!domain) return res.status(404).json({ error: 'Domain not found' });

        const result = storeAgentData(dataType, domainId, req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
