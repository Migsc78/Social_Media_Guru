import 'dotenv/config';
import OpenAI from 'openai';

/**
 * Multi-provider LLM client for SMMA agents.
 * Fetches active provider config from the backend settings API,
 * then creates an OpenAI-compatible client for that provider.
 *
 * Supported providers: openai, anthropic (via proxy), google (via proxy),
 * ollama, lmstudio, openrouter, custom — all via OpenAI-compatible endpoints.
 */

let cachedClient = null;
let cachedConfig = null;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * Fetch the active provider configuration from the backend.
 */
async function fetchProviderConfig() {
    try {
        const [activeResp, settingsResp] = await Promise.all([
            fetch(`${BACKEND_URL}/api/settings/active-provider`),
            fetch(`${BACKEND_URL}/api/settings`),
        ]);
        const { activeProvider } = await activeResp.json();
        const settings = await settingsResp.json();

        const prefix = activeProvider;
        return {
            provider: activeProvider,
            apiKey: settings[`${prefix}_api_key`] || process.env.OPENAI_API_KEY || 'sk-mock',
            baseUrl: settings[`${prefix}_base_url`] || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            model: settings[`${prefix}_model`] || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        };
    } catch (err) {
        // Fallback to env vars if backend is unreachable
        console.warn('[LLM] Could not fetch provider config from backend, falling back to env vars:', err.message);
        return {
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY || 'sk-mock',
            baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        };
    }
}

/**
 * Get an OpenAI-compatible client for the active provider.
 * Re-fetches config on each call to pick up changes from the Settings UI.
 */
export async function getClient() {
    const config = await fetchProviderConfig();

    // Reuse client if config hasn't changed
    if (cachedClient && cachedConfig &&
        cachedConfig.apiKey === config.apiKey &&
        cachedConfig.baseUrl === config.baseUrl) {
        cachedConfig = config; // update model at least
        return { client: cachedClient, config };
    }

    cachedClient = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
    });
    cachedConfig = config;

    console.log(`[LLM] Using provider: ${config.provider} | model: ${config.model} | baseURL: ${config.baseUrl}`);
    return { client: cachedClient, config };
}

/**
 * Call the LLM with a system + user prompt and get JSON back.
 */
export async function callLLM(systemPrompt, userPrompt, { temperature = 0.7, maxTokens = 4000 } = {}) {
    try {
        const { client, config } = await getClient();

        const requestOpts = {
            model: config.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature,
            max_tokens: maxTokens,
        };

        // Only use response_format for providers that support it
        const supportsJsonMode = ['openai', 'openrouter'].includes(config.provider)
            || config.baseUrl?.includes('openai.com');
        if (supportsJsonMode) {
            requestOpts.response_format = { type: 'json_object' };
        }

        const response = await client.chat.completions.create(requestOpts);
        const content = response.choices[0]?.message?.content || '{}';
        return JSON.parse(content);
    } catch (err) {
        console.error('[LLM ERROR]', err.message);
        throw new Error(`LLM call failed: ${err.message}`);
    }
}

/**
 * Fetch data from backend API.
 */
export async function fetchFromBackend(path) {
    const resp = await fetch(`${BACKEND_URL}${path}`);
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Backend fetch failed: ${resp.status} ${err}`);
    }
    return resp.json();
}

/**
 * Post data to backend API.
 */
export async function postToBackend(path, data) {
    const resp = await fetch(`${BACKEND_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Backend post failed: ${resp.status} ${err}`);
    }
    return resp.json();
}

export async function putToBackend(path, data) {
    const resp = await fetch(`${BACKEND_URL}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Backend put failed: ${resp.status} ${err}`);
    }
    return resp.json();
}
