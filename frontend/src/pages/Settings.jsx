import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

export default function Settings() {
    const [providers, setProviders] = useState([]);
    const [settings, setSettings] = useState({});
    const [activeProvider, setActiveProvider] = useState('openai');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [expandedProvider, setExpandedProvider] = useState(null);
    const [dirtyFields, setDirtyFields] = useState({});

    useEffect(() => { loadAll(); }, []);

    async function loadAll() {
        try {
            setLoading(true);
            const [providersData, settingsData, activeData] = await Promise.all([
                fetch(`${API_BASE}/settings/providers`).then(r => r.json()),
                fetch(`${API_BASE}/settings`).then(r => r.json()),
                fetch(`${API_BASE}/settings/active-provider`).then(r => r.json()),
            ]);
            setProviders(providersData);
            setSettings(settingsData);
            setActiveProvider(activeData.activeProvider || 'openai');
            setExpandedProvider(activeData.activeProvider || 'openai');
        } catch (err) {
            console.error('Failed to load settings:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSetActiveProvider(providerId) {
        try {
            await fetch(`${API_BASE}/settings/active-provider`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ providerId }),
            });
            setActiveProvider(providerId);
            setTestResult(null);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }

    async function handleSaveProvider(providerId) {
        try {
            setSaving(true);
            const provider = providers.find(p => p.id === providerId);
            const updates = {};
            for (const field of provider.fields) {
                if (dirtyFields[field.key] !== undefined) {
                    updates[field.key] = dirtyFields[field.key];
                }
            }
            if (Object.keys(updates).length === 0) return;

            const resp = await fetch(`${API_BASE}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            const updatedSettings = await resp.json();
            setSettings(updatedSettings);
            setDirtyFields({});
        } catch (err) {
            alert('Save failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleTestConnection() {
        try {
            setTesting(true);
            setTestResult(null);
            const resp = await fetch(`${API_BASE}/settings/test-connection`);
            const result = await resp.json();
            setTestResult(result);
        } catch (err) {
            setTestResult({ success: false, error: err.message });
        } finally {
            setTesting(false);
        }
    }

    function handleFieldChange(key, value) {
        setDirtyFields(prev => ({ ...prev, [key]: value }));
    }

    function getFieldValue(key, defaultValue = '') {
        if (dirtyFields[key] !== undefined) return dirtyFields[key];
        return settings[key] || defaultValue;
    }

    function isProviderConfigured(providerId) {
        const provider = providers.find(p => p.id === providerId);
        if (!provider) return false;
        const keyField = provider.fields.find(f => f.key.includes('api_key'));
        const urlField = provider.fields.find(f => f.key.includes('base_url'));
        if (keyField) return !!settings[keyField.key];
        if (urlField) return !!settings[urlField.key];
        return false;
    }

    function hasDirtyFields(providerId) {
        const provider = providers.find(p => p.id === providerId);
        if (!provider) return false;
        return provider.fields.some(f => dirtyFields[f.key] !== undefined);
    }

    if (loading) {
        return (
            <div className="empty-state">
                <div className="spinner" style={{ width: 40, height: 40 }}></div>
                <p className="text-muted mt-4">Loading settings…</p>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Configure your AI provider and API keys</p>
            </div>

            {/* Active Provider Banner */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(0,206,209,0.10))', border: '1px solid rgba(108,92,231,0.3)', marginBottom: 'var(--space-6)' }}>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Active Provider</div>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                            {providers.find(p => p.id === activeProvider)?.icon}{' '}
                            {providers.find(p => p.id === activeProvider)?.name || activeProvider}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={handleTestConnection} disabled={testing}>
                            {testing ? <><span className="spinner"></span> Testing…</> : '🔌 Test Connection'}
                        </button>
                    </div>
                </div>
                {testResult && (
                    <div style={{
                        marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-lg)',
                        background: testResult.success ? 'rgba(0,184,148,0.1)' : 'rgba(255,118,117,0.1)',
                        border: `1px solid ${testResult.success ? 'rgba(0,184,148,0.3)' : 'rgba(255,118,117,0.3)'}`,
                    }}>
                        <div className="flex items-center gap-2">
                            <span style={{ fontSize: '1.2em' }}>{testResult.success ? '✅' : '❌'}</span>
                            <span style={{ fontWeight: 600, color: testResult.success ? 'var(--success)' : 'var(--error)' }}>
                                {testResult.success ? 'Connection successful!' : 'Connection failed'}
                            </span>
                        </div>
                        {testResult.success && (
                            <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                                Model: {testResult.model} · Latency: {testResult.latencyMs}ms · Response: "{testResult.response}"
                            </div>
                        )}
                        {testResult.error && (
                            <div className="text-sm" style={{ marginTop: 4, color: 'var(--error)' }}>{testResult.error}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Provider Cards */}
            <div className="flex-col gap-3">
                {providers.map(provider => {
                    const isActive = activeProvider === provider.id;
                    const isExpanded = expandedProvider === provider.id;
                    const isConfigured = isProviderConfigured(provider.id);
                    const hasDirty = hasDirtyFields(provider.id);

                    return (
                        <div key={provider.id} className="card" style={{
                            border: isActive ? '1px solid rgba(108,92,231,0.5)' : undefined,
                            boxShadow: isActive ? '0 0 20px rgba(108,92,231,0.15)' : undefined,
                        }}>
                            {/* Header */}
                            <div className="flex justify-between items-center" style={{ cursor: 'pointer' }}
                                onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}>
                                <div className="flex items-center gap-3">
                                    <span style={{ fontSize: '1.6em' }}>{provider.icon}</span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>{provider.name}</span>
                                            {isActive && <span className="badge" style={{ background: 'rgba(108,92,231,0.2)', color: 'var(--accent-primary)', fontSize: '0.65rem' }}>ACTIVE</span>}
                                            {isConfigured && !isActive && <span className="badge" style={{ background: 'rgba(0,184,148,0.15)', color: 'var(--success)', fontSize: '0.65rem' }}>CONFIGURED</span>}
                                        </div>
                                        <div className="text-sm text-muted">{provider.description}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isActive && isConfigured && (
                                        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); handleSetActiveProvider(provider.id); }}>
                                            Activate
                                        </button>
                                    )}
                                    <span style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                                </div>
                            </div>

                            {/* Expanded Config */}
                            {isExpanded && (
                                <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--bg-glass-border)' }}>
                                    {provider.fields.map(field => (
                                        <div key={field.key} className="form-group">
                                            <label className="form-label">{field.label}</label>
                                            {field.type === 'select' ? (
                                                <select className="form-select" value={getFieldValue(field.key, field.default || '')}
                                                    onChange={e => handleFieldChange(field.key, e.target.value)}>
                                                    <option value="">— Select —</option>
                                                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            ) : (
                                                <input className="form-input"
                                                    type={field.type === 'password' ? 'password' : 'text'}
                                                    value={getFieldValue(field.key, field.default || '')}
                                                    placeholder={field.placeholder}
                                                    onChange={e => handleFieldChange(field.key, e.target.value)} />
                                            )}
                                        </div>
                                    ))}

                                    <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                                        {!isActive && (
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleSetActiveProvider(provider.id)}>
                                                Set as Active
                                            </button>
                                        )}
                                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveProvider(provider.id)}
                                            disabled={saving || !hasDirty}>
                                            {saving ? <><span className="spinner"></span> Saving…</> : '💾 Save'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Help Section */}
            <div className="card" style={{ marginTop: 'var(--space-6)', background: 'rgba(255,255,255,0.02)' }}>
                <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>💡 Quick Setup Guide</h3>
                <div className="text-sm text-secondary" style={{ lineHeight: 1.8 }}>
                    <p><strong>Cloud providers</strong> (OpenAI, Anthropic, Google): Get an API key from the provider's dashboard, paste it above, and select your preferred model.</p>
                    <p style={{ marginTop: 'var(--space-3)' }}><strong>Local models</strong> (Ollama, LM Studio): Install the software, download a model, then point the Base URL to your local server. No API key needed!</p>
                    <p style={{ marginTop: 'var(--space-3)' }}><strong>OpenRouter</strong>: Access 100+ models through a single API key. Great for trying different models without separate accounts.</p>
                    <p style={{ marginTop: 'var(--space-3)' }}><strong>Custom</strong>: Any server that exposes an OpenAI-compatible <code>/v1/chat/completions</code> endpoint — vLLM, text-generation-webui, LocalAI, etc.</p>
                </div>
            </div>
        </div>
    );
}
