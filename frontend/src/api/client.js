const API_BASE = '/api';

async function request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    };
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }
    const resp = await fetch(url, config);
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(err.error || resp.statusText);
    }
    return resp.json();
}

// ─── Domains ───────────────────────────────────────────
export const getDomains = () => request('/domains');
export const getDomain = (id) => request(`/domains/${id}`);
export const createDomain = (data) => request('/domains', { method: 'POST', body: data });
export const updateDomain = (id, data) => request(`/domains/${id}`, { method: 'PUT', body: data });
export const deleteDomain = (id) => request(`/domains/${id}`, { method: 'DELETE' });

// ─── Pipeline ──────────────────────────────────────────
export const triggerCrawl = (domainId, opts = {}) => request(`/domains/${domainId}/crawl`, { method: 'POST', body: opts });
export const getPipelineStatus = (domainId) => request(`/domains/${domainId}/status`);
export const triggerPipeline = (domainId, opts = {}) => request(`/domains/${domainId}/pipeline`, { method: 'POST', body: opts });

// ─── Agent Data ────────────────────────────────────────
export const getAgentData = (type, domainId) => request(`/agent/${type}/${domainId}`);
export const postAgentData = (type, domainId, data) => request(`/agent/${type}/${domainId}`, { method: 'POST', body: data });

// ─── Crawled Pages ─────────────────────────────────────
export const getCrawledPages = (domainId) => request(`/domains/${domainId}/pages`);

// ─── Posts ─────────────────────────────────────────────
export const getPostDrafts = (domainId, filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request(`/domains/${domainId}/posts${params ? '?' + params : ''}`);
};
export const getPostDraft = (id) => request(`/posts/${id}`);
export const updatePostDraft = (id, data) => request(`/posts/${id}`, { method: 'PUT', body: data });
export const bulkUpdateStatus = (ids, status) => request('/posts/bulk-status', { method: 'POST', body: { ids, status } });
export const storePostDrafts = (domainId, data) => request(`/domains/${domainId}/posts`, { method: 'POST', body: data });
