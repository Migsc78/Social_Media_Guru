import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

const PLATFORM_META = {
    twitter: { label: 'Twitter / X', color: '#1da1f2', icon: '𝕏' },
    facebook: { label: 'Facebook', color: '#4267b2', icon: '📘' },
    instagram: { label: 'Instagram', color: '#e1306c', icon: '📸' },
    linkedin: { label: 'LinkedIn', color: '#0077b5', icon: '💼' },
    pinterest: { label: 'Pinterest', color: '#e60023', icon: '📌' },
    tiktok: { label: 'TikTok', color: '#ff0050', icon: '🎵' },
    youtube: { label: 'YouTube', color: '#ff0000', icon: '▶️' },
};

export default function PersonaView({ domainId }) {
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState(null);

    useEffect(() => { if (domainId) loadPersonas(); }, [domainId]);

    async function loadPersonas() {
        try {
            setLoading(true);
            const resp = await fetch(`${API_BASE}/personas/${domainId}`);
            const data = await resp.json();
            setPersonas(data);
            if (data.length > 0 && !expandedId) setExpandedId(data[0].id);
        } catch (err) {
            console.error('Failed to load personas:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerate() {
        if (!domainId) return alert('Please select a domain first.');
        try {
            setGenerating(true);
            // The pipeline endpoint will trigger persona generation
            const resp = await fetch(`${API_BASE}/personas/${domainId}/generate`, { method: 'POST' });
            if (!resp.ok) {
                // Fallback: generate mock personas for demo
                await generateMockPersonas();
            } else {
                await loadPersonas();
            }
        } catch {
            await generateMockPersonas();
        } finally {
            setGenerating(false);
        }
    }

    async function generateMockPersonas() {
        // If no LLM configured, use this to demo the UI
        const mockPersonas = [
            {
                name: 'Sarah Mitchell',
                avatarEmoji: '👩‍💼',
                isPrimary: true,
                demographics: { ageRange: '28-35', gender: 'Female', location: 'Urban US', incomeRange: '$60K-$90K', education: "Bachelor's degree", jobTitle: 'Marketing Manager', industry: 'B2B SaaS' },
                psychographics: { values: ['efficiency', 'career growth', 'work-life balance'], interests: ['productivity tools', 'industry podcasts', 'networking'], lifestyle: 'Busy professional juggling multiple projects', attitudes: 'Early adopter, values ROI over trends' },
                painPoints: ['Spending too much time creating social content manually', 'Difficulty maintaining consistent brand voice across platforms', 'No clear content strategy — posting feels random'],
                motivations: ['Grow brand visibility and lead generation through social', 'Impress leadership with measurable social media ROI', 'Free up time for higher-level strategy work'],
                buyingTriggers: ['Boss asks for a social media report and there is nothing to show', 'Competitor starts getting traction on LinkedIn', 'Current tool subscription is up for renewal'],
                objections: ['Will AI content sound generic?', 'How long until I see results?', 'Can I trust an AI to understand our niche?'],
                preferredPlatforms: ['linkedin', 'twitter'],
                contentPreferences: { formats: ['case studies', 'how-to guides', 'short videos'], topics: ['productivity', 'team management', 'industry trends'], tonePreference: 'Professional but approachable' },
                onlineBehavior: { activeHours: '8am-6pm weekdays', contentConsumption: 'Skims headlines, deep-reads what resonates', engagementStyle: 'Shares useful content, comments on thought leadership' },
                keywords: ['social media management', 'content calendar', 'marketing automation', 'brand consistency'],
            },
            {
                name: 'Jason Rivera',
                avatarEmoji: '👨‍💻',
                isPrimary: false,
                demographics: { ageRange: '22-28', gender: 'Male', location: 'Remote / Global', incomeRange: '$40K-$65K', education: 'Self-taught / Bootcamp', jobTitle: 'Freelance Social Media Manager', industry: 'Agency / Freelance' },
                psychographics: { values: ['freedom', 'creativity', 'hustle culture'], interests: ['creator economy', 'AI tools', 'side projects'], lifestyle: 'Works from coffee shops, manages multiple clients', attitudes: 'Loves trying new tools, early adopter' },
                painPoints: ['Managing 5+ client accounts with different voices', 'Clients want more content but the budget stays flat', 'Keeping up with algorithm changes across platforms'],
                motivations: ['Scale his freelance business without hiring', 'Deliver better results to justify higher rates', 'Build a reputation as a cutting-edge SMM'],
                buyingTriggers: ['Takes on a new client and needs to ramp up fast', 'Sees a competitor freelancer using AI tools', 'Client threatens to leave due to inconsistent posting'],
                objections: ['Is the free tier enough for my needs?', 'Will my clients know I am using AI?', 'Does it support the platforms my clients care about?'],
                preferredPlatforms: ['instagram', 'tiktok', 'twitter'],
                contentPreferences: { formats: ['reels', 'carousels', 'memes', 'threads'], topics: ['trends', 'behind-the-scenes', 'client results'], tonePreference: 'Casual, punchy, trend-aware' },
                onlineBehavior: { activeHours: '10am-midnight, irregular', contentConsumption: 'Heavy video consumer, discovers through TikTok/Reels', engagementStyle: 'Comments frequently, shares hot takes' },
                keywords: ['AI content creation', 'social media automation', 'freelance tools', 'client management'],
            },
        ];

        const resp = await fetch(`${API_BASE}/personas/${domainId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personas: mockPersonas }),
        });
        if (resp.ok) await loadPersonas();
    }

    async function handleSaveEdit(personaId) {
        try {
            const resp = await fetch(`${API_BASE}/personas/${domainId}/${personaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            });
            if (resp.ok) {
                setEditingId(null);
                setEditData(null);
                await loadPersonas();
            }
        } catch (err) {
            alert('Save failed: ' + err.message);
        }
    }

    async function handleDelete(personaId) {
        if (!confirm('Delete this persona?')) return;
        try {
            await fetch(`${API_BASE}/personas/${domainId}/${personaId}`, { method: 'DELETE' });
            await loadPersonas();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    }

    function startEdit(p) {
        setEditingId(p.id);
        setEditData({
            name: p.name,
            avatarEmoji: p.avatar_emoji,
            demographics: p.demographics,
            psychographics: p.psychographics,
            painPoints: p.pain_points,
            motivations: p.motivations,
            buyingTriggers: p.buying_triggers,
            objections: p.objections,
            preferredPlatforms: p.preferred_platforms,
            contentPreferences: p.content_preferences,
            onlineBehavior: p.online_behavior,
            keywords: p.keywords,
            isPrimary: p.is_primary,
        });
    }

    // No domain selected
    if (!domainId) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🎯</div>
                <h2 className="empty-state-title">No Domain Selected</h2>
                <p className="empty-state-text">Select a domain from the Domains page first, then come back to generate personas.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Target Personas</h1>
                        <p className="page-subtitle">AI-generated buyer personas tailored to your brand and goals</p>
                    </div>
                    <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                        {generating ? <><span className="spinner"></span> Generating…</> : personas.length > 0 ? '🔄 Regenerate' : '✨ Generate Personas'}
                    </button>
                </div>
            </div>

            {loading && (
                <div className="empty-state">
                    <div className="spinner" style={{ width: 40, height: 40 }}></div>
                    <p className="text-muted mt-4">Loading personas…</p>
                </div>
            )}

            {!loading && personas.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">🎭</div>
                    <h2 className="empty-state-title">No Personas Yet</h2>
                    <p className="empty-state-text">
                        Click "Generate Personas" to let AI analyze your website and competitors to create detailed target audience personas.
                    </p>
                    <button className="btn btn-primary mt-4" onClick={handleGenerate} disabled={generating}>
                        {generating ? <><span className="spinner"></span> Analyzing…</> : '✨ Generate Personas'}
                    </button>
                </div>
            )}

            {/* Persona Cards */}
            {!loading && personas.length > 0 && (
                <div className="flex-col gap-4">
                    {personas.map(persona => {
                        const isExpanded = expandedId === persona.id;
                        const isEditing = editingId === persona.id;
                        const p = isEditing ? editData : {
                            name: persona.name,
                            avatarEmoji: persona.avatar_emoji,
                            demographics: persona.demographics,
                            psychographics: persona.psychographics,
                            painPoints: persona.pain_points,
                            motivations: persona.motivations,
                            buyingTriggers: persona.buying_triggers,
                            objections: persona.objections,
                            preferredPlatforms: persona.preferred_platforms,
                            contentPreferences: persona.content_preferences,
                            onlineBehavior: persona.online_behavior,
                            keywords: persona.keywords,
                            isPrimary: persona.is_primary,
                        };

                        return (
                            <div key={persona.id} className="card" style={{
                                border: persona.is_primary ? '1px solid rgba(108,92,231,0.4)' : undefined,
                                boxShadow: persona.is_primary ? '0 0 30px rgba(108,92,231,0.1)' : undefined,
                            }}>
                                {/* Header */}
                                <div className="flex justify-between items-center" style={{ cursor: 'pointer' }}
                                    onClick={() => !isEditing && setExpandedId(isExpanded ? null : persona.id)}>
                                    <div className="flex items-center gap-3">
                                        <div style={{
                                            width: 56, height: 56, borderRadius: 'var(--radius-lg)',
                                            background: persona.is_primary
                                                ? 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(0,206,209,0.15))'
                                                : 'var(--bg-card)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
                                        }}>{p.avatarEmoji}</div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <input className="form-input" value={p.name} style={{ width: 200, fontWeight: 700, fontSize: 'var(--font-size-lg)', padding: '2px 8px' }}
                                                        onChange={e => setEditData({ ...editData, name: e.target.value })} />
                                                ) : (
                                                    <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>{p.name}</span>
                                                )}
                                                {persona.is_primary && <span className="badge" style={{ background: 'rgba(108,92,231,0.2)', color: 'var(--accent-primary)', fontSize: '0.6rem' }}>PRIMARY</span>}
                                                {!persona.is_ai_generated && <span className="badge" style={{ background: 'rgba(0,184,148,0.15)', color: 'var(--success)', fontSize: '0.6rem' }}>EDITED</span>}
                                            </div>
                                            <div className="text-sm text-muted">
                                                {p.demographics?.jobTitle || 'Target Customer'} · {p.demographics?.ageRange || 'All ages'} · {p.demographics?.location || 'Global'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isEditing && (
                                            <>
                                                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); startEdit(persona); }}>✏️ Edit</button>
                                                <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(persona.id); }}>🗑️</button>
                                            </>
                                        )}
                                        {isEditing && (
                                            <>
                                                <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleSaveEdit(persona.id); }}>💾 Save</button>
                                                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setEditingId(null); setEditData(null); }}>Cancel</button>
                                            </>
                                        )}
                                        {!isEditing && <span style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 4 }}>▼</span>}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {(isExpanded || isEditing) && (
                                    <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--bg-glass-border)' }}>
                                        <div className="grid-2" style={{ gap: 'var(--space-6)' }}>

                                            {/* Demographics */}
                                            <PersonaSection title="👤 Demographics" icon="demographics">
                                                {isEditing ? (
                                                    <EditableKeyValue data={p.demographics} onChange={d => setEditData({ ...editData, demographics: d })}
                                                        fields={[
                                                            { key: 'ageRange', label: 'Age Range' }, { key: 'gender', label: 'Gender' },
                                                            { key: 'location', label: 'Location' }, { key: 'incomeRange', label: 'Income' },
                                                            { key: 'education', label: 'Education' }, { key: 'jobTitle', label: 'Job Title' },
                                                            { key: 'industry', label: 'Industry' },
                                                        ]} />
                                                ) : (
                                                    <div className="persona-details">
                                                        {Object.entries(p.demographics || {}).map(([k, v]) => (
                                                            <div key={k} className="persona-detail-row">
                                                                <span className="persona-detail-label">{camelToTitle(k)}</span>
                                                                <span className="persona-detail-value">{v}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </PersonaSection>

                                            {/* Psychographics */}
                                            <PersonaSection title="🧠 Psychographics">
                                                {isEditing ? (
                                                    <div>
                                                        <EditableList label="Values" items={p.psychographics?.values || []}
                                                            onChange={v => setEditData({ ...editData, psychographics: { ...editData.psychographics, values: v } })} />
                                                        <EditableList label="Interests" items={p.psychographics?.interests || []}
                                                            onChange={v => setEditData({ ...editData, psychographics: { ...editData.psychographics, interests: v } })} />
                                                    </div>
                                                ) : (
                                                    <div className="persona-details">
                                                        {p.psychographics?.values?.length > 0 && <div className="persona-detail-row"><span className="persona-detail-label">Values</span><span className="persona-detail-value">{p.psychographics.values.join(', ')}</span></div>}
                                                        {p.psychographics?.interests?.length > 0 && <div className="persona-detail-row"><span className="persona-detail-label">Interests</span><span className="persona-detail-value">{p.psychographics.interests.join(', ')}</span></div>}
                                                        {p.psychographics?.lifestyle && <div className="persona-detail-row"><span className="persona-detail-label">Lifestyle</span><span className="persona-detail-value">{p.psychographics.lifestyle}</span></div>}
                                                        {p.psychographics?.attitudes && <div className="persona-detail-row"><span className="persona-detail-label">Attitudes</span><span className="persona-detail-value">{p.psychographics.attitudes}</span></div>}
                                                    </div>
                                                )}
                                            </PersonaSection>

                                            {/* Pain Points */}
                                            <PersonaSection title="😣 Pain Points">
                                                {isEditing ? (
                                                    <EditableList items={p.painPoints || []} onChange={v => setEditData({ ...editData, painPoints: v })} />
                                                ) : (
                                                    <ul className="persona-list">{(p.painPoints || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                                                )}
                                            </PersonaSection>

                                            {/* Motivations */}
                                            <PersonaSection title="🎯 Motivations">
                                                {isEditing ? (
                                                    <EditableList items={p.motivations || []} onChange={v => setEditData({ ...editData, motivations: v })} />
                                                ) : (
                                                    <ul className="persona-list">{(p.motivations || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                                                )}
                                            </PersonaSection>

                                            {/* Buying Triggers */}
                                            <PersonaSection title="⚡ Buying Triggers">
                                                {isEditing ? (
                                                    <EditableList items={p.buyingTriggers || []} onChange={v => setEditData({ ...editData, buyingTriggers: v })} />
                                                ) : (
                                                    <ul className="persona-list">{(p.buyingTriggers || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                                                )}
                                            </PersonaSection>

                                            {/* Objections */}
                                            <PersonaSection title="🚧 Objections">
                                                {isEditing ? (
                                                    <EditableList items={p.objections || []} onChange={v => setEditData({ ...editData, objections: v })} />
                                                ) : (
                                                    <ul className="persona-list">{(p.objections || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                                                )}
                                            </PersonaSection>

                                            {/* Preferred Platforms */}
                                            <PersonaSection title="📱 Preferred Platforms">
                                                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                                                    {(p.preferredPlatforms || []).map(pl => {
                                                        const meta = PLATFORM_META[pl] || { label: pl, color: '#888', icon: '📱' };
                                                        return (
                                                            <span key={pl} style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                                                                background: `${meta.color}20`, color: meta.color,
                                                                fontSize: 'var(--font-size-xs)', fontWeight: 600,
                                                            }}>
                                                                {meta.icon} {meta.label}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </PersonaSection>

                                            {/* Content Preferences */}
                                            <PersonaSection title="📝 Content Preferences">
                                                {isEditing ? (
                                                    <div>
                                                        <EditableList label="Formats" items={p.contentPreferences?.formats || []}
                                                            onChange={v => setEditData({ ...editData, contentPreferences: { ...editData.contentPreferences, formats: v } })} />
                                                        <EditableList label="Topics" items={p.contentPreferences?.topics || []}
                                                            onChange={v => setEditData({ ...editData, contentPreferences: { ...editData.contentPreferences, topics: v } })} />
                                                    </div>
                                                ) : (
                                                    <div className="persona-details">
                                                        {p.contentPreferences?.formats?.length > 0 && <div className="persona-detail-row"><span className="persona-detail-label">Formats</span><span className="persona-detail-value">{p.contentPreferences.formats.join(', ')}</span></div>}
                                                        {p.contentPreferences?.topics?.length > 0 && <div className="persona-detail-row"><span className="persona-detail-label">Topics</span><span className="persona-detail-value">{p.contentPreferences.topics.join(', ')}</span></div>}
                                                        {p.contentPreferences?.tonePreference && <div className="persona-detail-row"><span className="persona-detail-label">Tone</span><span className="persona-detail-value">{p.contentPreferences.tonePreference}</span></div>}
                                                    </div>
                                                )}
                                            </PersonaSection>

                                            {/* Online Behavior */}
                                            <PersonaSection title="🌐 Online Behavior">
                                                <div className="persona-details">
                                                    {p.onlineBehavior?.activeHours && <div className="persona-detail-row"><span className="persona-detail-label">Active Hours</span><span className="persona-detail-value">{p.onlineBehavior.activeHours}</span></div>}
                                                    {p.onlineBehavior?.contentConsumption && <div className="persona-detail-row"><span className="persona-detail-label">Consumption</span><span className="persona-detail-value">{p.onlineBehavior.contentConsumption}</span></div>}
                                                    {p.onlineBehavior?.engagementStyle && <div className="persona-detail-row"><span className="persona-detail-label">Engagement</span><span className="persona-detail-value">{p.onlineBehavior.engagementStyle}</span></div>}
                                                </div>
                                            </PersonaSection>

                                            {/* Keywords */}
                                            <PersonaSection title="🔑 Keywords & Search Terms">
                                                {isEditing ? (
                                                    <EditableList items={p.keywords || []} onChange={v => setEditData({ ...editData, keywords: v })} />
                                                ) : (
                                                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                                                        {(p.keywords || []).map((kw, i) => (
                                                            <span key={i} style={{
                                                                padding: '3px 10px', borderRadius: 'var(--radius-full)',
                                                                background: 'var(--bg-card)', border: '1px solid var(--bg-glass-border)',
                                                                fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)',
                                                            }}>{kw}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </PersonaSection>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ─── Sub-components ────────────────────────────────────────── */

function PersonaSection({ title, children }) {
    return (
        <div style={{ marginBottom: 'var(--space-4)' }}>
            <h4 style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>{title}</h4>
            {children}
        </div>
    );
}

function EditableList({ label, items, onChange }) {
    function handleChange(i, val) {
        const next = [...items];
        next[i] = val;
        onChange(next);
    }
    function handleAdd() { onChange([...items, '']); }
    function handleRemove(i) { onChange(items.filter((_, j) => j !== i)); }

    return (
        <div style={{ marginBottom: 'var(--space-3)' }}>
            {label && <div className="text-xs text-muted" style={{ marginBottom: 4 }}>{label}</div>}
            {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                    <input className="form-input" value={item} onChange={e => handleChange(i, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }} />
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemove(i)} style={{ padding: '2px 6px', minWidth: 24 }}>×</button>
                </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={handleAdd} style={{ marginTop: 2, fontSize: '0.7rem' }}>+ Add</button>
        </div>
    );
}

function EditableKeyValue({ data, onChange, fields }) {
    function handleChange(key, value) {
        onChange({ ...data, [key]: value });
    }
    return (
        <div>
            {fields.map(f => (
                <div key={f.key} className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                    <span className="text-xs text-muted" style={{ width: 80, flexShrink: 0 }}>{f.label}</span>
                    <input className="form-input" value={data?.[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }} />
                </div>
            ))}
        </div>
    );
}

function camelToTitle(str) {
    return str.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}
