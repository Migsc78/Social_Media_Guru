import { Router } from 'express';
import { storePersonas, getPersonas, updatePersona, deletePersona } from '../db/database.js';

export const personaRoutes = Router();

// GET /api/personas/:domainId — get all personas for a domain
personaRoutes.get('/:domainId', (req, res) => {
    try {
        const personas = getPersonas(req.params.domainId);
        res.json(personas);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/personas/:domainId — store generated personas (replaces existing)
personaRoutes.post('/:domainId', (req, res) => {
    try {
        const { personas } = req.body;
        if (!Array.isArray(personas) || personas.length === 0) {
            return res.status(400).json({ error: 'personas array is required' });
        }
        const stored = storePersonas(req.params.domainId, personas);
        res.json(stored);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/personas/:domainId/:personaId — update a single persona
personaRoutes.put('/:domainId/:personaId', (req, res) => {
    try {
        const updated = updatePersona(req.params.personaId, req.body);
        if (!updated) return res.status(404).json({ error: 'Persona not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/personas/:domainId/:personaId — delete a persona
personaRoutes.delete('/:domainId/:personaId', (req, res) => {
    try {
        deletePersona(req.params.personaId);
        res.json({ deleted: req.params.personaId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
