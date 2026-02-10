import { Router } from 'express';
import { getSetting, setSetting, getAllSettings, deleteSetting } from '../db/database.js';

export const settingsRoutes = Router();

// Provider definitions (not stored in DB, just metadata for the frontend)
const PROVIDERS = [
    {
        id: 'openai',
        name: 'OpenAI',
        description: 'GPT-4o, GPT-4o-mini, o1, o3 and more',
        icon: '🟢',
        fields: [
            { key: 'openai_api_key', label: 'API Key', type: 'password', placeholder: 'sk-...' },
            { key: 'openai_base_url', label: 'Base URL', type: 'text', placeholder: 'https://api.openai.com/v1', default: 'https://api.openai.com/v1' },
            { key: 'openai_model', label: 'Model', type: 'select', options: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'], default: 'gpt-4o-mini' },
        ]
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        description: 'Claude 3.5 Sonnet, Claude 3 Opus, Haiku',
        icon: '🟠',
        fields: [
            { key: 'anthropic_api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-...' },
            { key: 'anthropic_base_url', label: 'Base URL', type: 'text', placeholder: 'https://api.anthropic.com', default: 'https://api.anthropic.com' },
            { key: 'anthropic_model', label: 'Model', type: 'select', options: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'], default: 'claude-sonnet-4-20250514' },
        ]
    },
    {
        id: 'google',
        name: 'Google AI',
        description: 'Gemini 2.0 Flash, Gemini 1.5 Pro',
        icon: '🔵',
        fields: [
            { key: 'google_api_key', label: 'API Key', type: 'password', placeholder: 'AIza...' },
            { key: 'google_model', label: 'Model', type: 'select', options: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'], default: 'gemini-2.0-flash' },
        ]
    },
    {
        id: 'ollama',
        name: 'Ollama',
        description: 'Local models — Llama 3, Mistral, Qwen, DeepSeek and more',
        icon: '🦙',
        fields: [
            { key: 'ollama_base_url', label: 'Base URL', type: 'text', placeholder: 'http://localhost:11434/v1', default: 'http://localhost:11434/v1' },
            { key: 'ollama_model', label: 'Model', type: 'text', placeholder: 'llama3.1, mistral, deepseek-r1, etc.' },
        ]
    },
    {
        id: 'lmstudio',
        name: 'LM Studio',
        description: 'Local inference server with any GGUF model',
        icon: '🖥️',
        fields: [
            { key: 'lmstudio_base_url', label: 'Base URL', type: 'text', placeholder: 'http://localhost:1234/v1', default: 'http://localhost:1234/v1' },
            { key: 'lmstudio_model', label: 'Model', type: 'text', placeholder: 'loaded model name' },
        ]
    },
    {
        id: 'openrouter',
        name: 'OpenRouter',
        description: 'Access 100+ models through a single API',
        icon: '🔀',
        fields: [
            { key: 'openrouter_api_key', label: 'API Key', type: 'password', placeholder: 'sk-or-...' },
            { key: 'openrouter_base_url', label: 'Base URL', type: 'text', placeholder: 'https://openrouter.ai/api/v1', default: 'https://openrouter.ai/api/v1' },
            { key: 'openrouter_model', label: 'Model', type: 'text', placeholder: 'meta-llama/llama-3.1-70b-instruct, etc.', default: '' },
        ]
    },
    {
        id: 'custom',
        name: 'Custom (OpenAI-compatible)',
        description: 'Any server with an OpenAI-compatible /chat/completions endpoint',
        icon: '🛠️',
        fields: [
            { key: 'custom_api_key', label: 'API Key', type: 'password', placeholder: 'optional' },
            { key: 'custom_base_url', label: 'Base URL', type: 'text', placeholder: 'http://your-server/v1' },
            { key: 'custom_model', label: 'Model', type: 'text', placeholder: 'model name' },
        ]
    }
];

// GET /api/settings/providers — list all providers and their config metadata
settingsRoutes.get('/providers', (req, res) => {
    res.json(PROVIDERS);
});

// GET /api/settings — get all settings (masks API key values)
settingsRoutes.get('/', (req, res) => {
    try {
        const all = getAllSettings();
        const masked = {};
        for (const [key, value] of Object.entries(all)) {
            masked[key] = key.includes('api_key') ? maskKey(value) : value;
        }
        res.json(masked);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/settings/active-provider — get the active provider id
settingsRoutes.get('/active-provider', (req, res) => {
    try {
        const active = getSetting('active_provider') || 'openai';
        res.json({ activeProvider: active });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings/active-provider — set the active provider
settingsRoutes.put('/active-provider', (req, res) => {
    try {
        const { providerId } = req.body;
        if (!PROVIDERS.find(p => p.id === providerId)) {
            return res.status(400).json({ error: 'Unknown provider: ' + providerId });
        }
        setSetting('active_provider', providerId);
        res.json({ activeProvider: providerId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings — save one or more settings key-value pairs
settingsRoutes.put('/', (req, res) => {
    try {
        const updates = req.body; // { key: value, ... }
        for (const [key, value] of Object.entries(updates)) {
            if (value === '' || value === null || value === undefined) {
                deleteSetting(key);
            } else {
                setSetting(key, String(value));
            }
        }
        // Return all settings (masked)
        const all = getAllSettings();
        const masked = {};
        for (const [k, v] of Object.entries(all)) {
            masked[k] = k.includes('api_key') ? maskKey(v) : v;
        }
        res.json(masked);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/settings/:key — remove a setting
settingsRoutes.delete('/:key', (req, res) => {
    try {
        deleteSetting(req.params.key);
        res.json({ deleted: req.params.key });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/settings/test-connection — test the active provider's LLM connection
settingsRoutes.get('/test-connection', async (req, res) => {
    try {
        const active = getSetting('active_provider') || 'openai';
        const config = getProviderConfig(active);

        if (!config.baseUrl) {
            return res.status(400).json({ error: `No base URL configured for ${active}` });
        }

        // Use dynamic import to avoid circular deps
        const { default: OpenAI } = await import('openai');
        const client = new OpenAI({
            apiKey: config.apiKey || 'not-needed',
            baseURL: config.baseUrl,
        });

        const t0 = Date.now();
        const response = await client.chat.completions.create({
            model: config.model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Reply with exactly: "connection ok"' }],
            max_tokens: 20,
            temperature: 0,
        });
        const latency = Date.now() - t0;
        const text = response.choices[0]?.message?.content || '';

        res.json({
            success: true,
            provider: active,
            model: config.model,
            response: text.trim(),
            latencyMs: latency,
        });
    } catch (err) {
        res.json({
            success: false,
            provider: getSetting('active_provider') || 'openai',
            error: err.message,
        });
    }
});

function getProviderConfig(providerId) {
    const DEFAULTS = {
        openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
        anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514' },
        google: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.0-flash' },
        ollama: { baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' },
        lmstudio: { baseUrl: 'http://localhost:1234/v1', model: '' },
        openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: '' },
        custom: { baseUrl: '', model: '' },
    };
    const defs = DEFAULTS[providerId] || { baseUrl: '', model: '' };
    return {
        apiKey: getSetting(`${providerId}_api_key`) || '',
        baseUrl: getSetting(`${providerId}_base_url`) || defs.baseUrl,
        model: getSetting(`${providerId}_model`) || defs.model,
    };
}

function maskKey(value) {
    if (!value || value.length < 8) return '••••••••';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
}
