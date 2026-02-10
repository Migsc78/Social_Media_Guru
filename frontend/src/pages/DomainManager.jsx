import React, { useState, useEffect, useRef } from 'react';
import { getDomains, createDomain, deleteDomain, triggerCrawl, getPipelineStatus } from '../api/client.js';

export default function DomainManager({ activeDomainId, onSelectDomain, onActivateDomain, onDomainChange }) {
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [pipelineStatus, setPipelineStatus] = useState({});

    const [runningPipeline, setRunningPipeline] = useState(null); // domainId if pipeline running
    const [showLog, setShowLog] = useState(null); // domainId to show log for
    const pollingRef = useRef(null);

    useEffect(() => { loadDomains(); return () => clearInterval(pollingRef.current); }, []);

    async function loadDomains() {
        try {
            setLoading(true);
            const data = await getDomains();
            setDomains(data);
            for (const d of data) {
                try {
                    const status = await getPipelineStatus(d.id);
                    setPipelineStatus(prev => ({ ...prev, [d.id]: status }));
                    if (status.pipelineStatus === 'running') {
                        setRunningPipeline(d.id);
                        setShowLog(d.id);
                        startPolling(d.id);
                    }
                } catch { /* ignore */ }
            }
        } catch (err) {
            console.error('Failed to load domains:', err);
        } finally {
            setLoading(false);
        }
    }

    function startPolling(domainId) {
        clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
            try {
                const status = await getPipelineStatus(domainId);
                setPipelineStatus(prev => ({ ...prev, [domainId]: status }));
                if (status.pipelineStatus !== 'running') {
                    clearInterval(pollingRef.current);
                    setRunningPipeline(null);
                }
            } catch { /* ignore */ }
        }, 2000);
    }

    async function handleAddDomain(formData) {
        try {
            await createDomain(formData);
            setShowAddModal(false);
            await loadDomains();
            if (onDomainChange) onDomainChange();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this domain and all associated data?')) return;
        try {
            await deleteDomain(id);
            await loadDomains();
            if (onDomainChange) onDomainChange();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }



    async function handleRunPipeline(domainId) {
        try {
            setRunningPipeline(domainId);
            setShowLog(domainId);
            const resp = await fetch(`/api/domains/${domainId}/pipeline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || 'Pipeline start failed');
            startPolling(domainId);
        } catch (err) {
            alert('Pipeline error: ' + err.message);
            setRunningPipeline(null);
        }
    }

    function getStatusSteps(domainId) {
        const s = pipelineStatus[domainId]?.steps;
        if (!s) return [];
        return [
            { name: 'Crawl', done: s.crawl?.done, detail: s.crawl?.pageCount ? `${s.crawl.pageCount} pages` : '', status: s.crawl?.status },
            { name: 'Site Analysis', done: s.siteAnalysis?.done, status: s.siteAnalysis?.status },
            { name: 'Competitors', done: s.competitorResearch?.done, status: s.competitorResearch?.status },
            { name: 'Personas', done: s.personaGeneration?.done, status: s.personaGeneration?.status },
            { name: 'Strategy', done: s.contentStrategy?.done, status: s.contentStrategy?.status },
            { name: 'Calendar', done: s.campaignCalendar?.done, status: s.campaignCalendar?.status },
        ];
    }

    if (loading) {
        return (
            <div className="empty-state">
                <div className="spinner" style={{ width: 40, height: 40 }}></div>
                <p className="text-muted mt-4">Loading domains…</p>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1 className="page-title">Domains</h1>
                    <p className="page-subtitle">Manage your websites and trigger analysis pipelines</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    + Add Domain
                </button>
            </div>

            {domains.length === 0 ? (
                <div className="empty-state card">
                    <div className="empty-state-icon">🌐</div>
                    <h3 className="empty-state-title">No domains yet</h3>
                    <p className="empty-state-text">Add your first domain to start generating social media campaigns.</p>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        + Add Your First Domain
                    </button>
                </div>
            ) : (
                <div className="flex-col gap-4">
                    {domains.map(domain => {
                        const steps = getStatusSteps(domain.id);
                        const completedSteps = steps.filter(s => s.done).length;
                        const isRunning = runningPipeline === domain.id;
                        const status = pipelineStatus[domain.id];
                        const logs = status?.logs || [];

                        return (
                            <div key={domain.id} className="card">
                                <div className="card-header">
                                    <div>
                                        <h3 className="card-title">{domain.name}</h3>
                                        <a href={domain.url} target="_blank" rel="noopener" className="text-sm">{domain.url}</a>
                                    </div>
                                    <div className="flex gap-2">
                                        {activeDomainId === domain.id ? (
                                            <span className="badge badge-published flex items-center gap-1" style={{ padding: '0 12px' }}>
                                                ● Active
                                            </span>
                                        ) : (
                                            <button className="btn btn-secondary btn-sm" onClick={() => onActivateDomain(domain.id)}>
                                                Activate
                                            </button>
                                        )}

                                        <button className="btn btn-primary btn-sm" onClick={() => handleRunPipeline(domain.id)}
                                            disabled={isRunning}>
                                            {isRunning ? <><span className="spinner"></span> Running…</> : '🚀 Run Pipeline'}
                                        </button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => onSelectDomain(domain.id)}>
                                            📅 View Campaign
                                        </button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(domain.id)}>🗑</button>
                                    </div>
                                </div>

                                <div className="flex gap-2 mb-4">
                                    <span className="badge badge-draft">{domain.primary_goal || 'drive_traffic'}</span>
                                    <span className="badge badge-scheduled">{domain.brand_voice_tone || 'professional'}</span>
                                    {status?.pipelineStatus && (
                                        <span className={`badge ${status.pipelineStatus === 'done' ? 'badge-published' : status.pipelineStatus === 'error' ? 'badge-draft' : 'badge-scheduled'}`}>
                                            {status.pipelineStatus === 'done' ? '✅ Complete' : status.pipelineStatus === 'error' ? '❌ Error' : status.pipelineStatus === 'running' ? '⏳ Running' : ''}
                                        </span>
                                    )}
                                </div>

                                {steps.length > 0 && (
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-xs text-muted">Pipeline Progress</span>
                                            <span className="text-xs text-secondary">{completedSteps}/{steps.length}</span>
                                        </div>
                                        <div className="progress-bar mb-4">
                                            <div className="progress-bar-fill" style={{ width: `${(completedSteps / steps.length) * 100}%` }}></div>
                                        </div>
                                        <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
                                            {steps.map((step, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                    <span style={{ color: step.done ? 'var(--success)' : step.status === 'running' ? 'var(--accent)' : 'var(--text-muted)' }}>
                                                        {step.done ? '✓' : step.status === 'running' ? '⟳' : '○'}
                                                    </span>
                                                    <span style={{
                                                        color: step.done ? 'var(--text-primary)' : step.status === 'running' ? 'var(--accent)' : 'var(--text-muted)',
                                                        fontWeight: step.status === 'running' ? '600' : '400',
                                                    }}>
                                                        {step.name}
                                                    </span>
                                                    {step.detail && <span className="text-muted">({step.detail})</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Activity Log Toggle */}
                                {(logs.length > 0 || isRunning) && (
                                    <div style={{ marginTop: 16 }}>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setShowLog(showLog === domain.id ? null : domain.id)}
                                            style={{ fontSize: 12 }}
                                        >
                                            {showLog === domain.id ? '▼' : '▶'} Activity Log ({logs.length})
                                        </button>
                                    </div>
                                )}

                                {/* Activity Log Panel */}
                                {showLog === domain.id && logs.length > 0 && (
                                    <ActivityLog logs={logs} isRunning={isRunning} />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showAddModal && <AddDomainModal onClose={() => setShowAddModal(false)} onSubmit={handleAddDomain} />}
        </div>
    );
}

function ActivityLog({ logs, isRunning }) {
    const logEndRef = useRef(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs.length]);

    return (
        <div className="activity-log" style={{
            marginTop: 12,
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
            maxHeight: 320,
            overflowY: 'auto',
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontSize: 12,
            lineHeight: 1.6,
        }}>
            <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                position: 'sticky',
                top: 0,
                background: 'rgba(15,15,20,0.95)',
                zIndex: 1,
            }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📋 Pipeline Activity</span>
                {isRunning && (
                    <span style={{
                        display: 'inline-block',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        animation: 'pulse 1.5s ease-in-out infinite',
                    }} />
                )}
            </div>
            <div style={{ padding: '4px 0' }}>
                {logs.map((entry, i) => {
                    const time = new Date(entry.time).toLocaleTimeString();
                    const color = entry.level === 'error' ? '#ef4444'
                        : entry.level === 'success' ? '#22c55e'
                            : 'var(--text-secondary)';
                    return (
                        <div key={i} style={{
                            padding: '3px 12px',
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start',
                        }}>
                            <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: 11 }}>{time}</span>
                            <span style={{ color }}>{entry.message}</span>
                        </div>
                    );
                })}
                {isRunning && (
                    <div style={{ padding: '3px 12px', color: 'var(--text-muted)' }}>
                        <span className="spinner" style={{ width: 10, height: 10, marginRight: 6 }}></span>
                        Processing...
                    </div>
                )}
                <div ref={logEndRef} />
            </div>
        </div>
    );
}

function AddDomainModal({ onClose, onSubmit }) {
    const [form, setForm] = useState({
        url: '', name: '', primaryGoal: 'drive_traffic',
        brandVoiceTone: 'professional', brandVoiceFormality: 'medium'
    });

    function handleChange(e) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.url || !form.name) return alert('URL and Name are required');
        onSubmit(form);
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Add Domain</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Website URL *</label>
                        <input className="form-input" name="url" value={form.url} onChange={handleChange}
                            placeholder="https://example.com" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Domain Name *</label>
                        <input className="form-input" name="name" value={form.name} onChange={handleChange}
                            placeholder="My Website" required />
                    </div>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Primary Goal</label>
                            <select className="form-select" name="primaryGoal" value={form.primaryGoal} onChange={handleChange}>
                                <option value="drive_traffic">Drive Traffic</option>
                                <option value="capture_emails">Capture Emails</option>
                                <option value="sell_products">Sell Products</option>
                                <option value="get_signups">Get Signups</option>
                                <option value="mixed">Mixed</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Brand Voice Tone</label>
                            <select className="form-select" name="brandVoiceTone" value={form.brandVoiceTone} onChange={handleChange}>
                                <option value="casual">Casual</option>
                                <option value="professional">Professional</option>
                                <option value="bold">Bold</option>
                                <option value="playful">Playful</option>
                                <option value="authoritative">Authoritative</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Domain</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
