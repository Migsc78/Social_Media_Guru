import React, { useState, useEffect } from 'react';
import { getPostDrafts, updatePostDraft, bulkUpdateStatus } from '../api/client.js';

const PLATFORM_ICONS = {
    twitter: '𝕏', facebook: 'f', instagram: '📷', linkedin: 'in', pinterest: '📌', tiktok: '♪'
};

export default function PostEditor({ domainId }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingPost, setEditingPost] = useState(null);
    const [filterPlatform, setFilterPlatform] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedIds, setSelectedIds] = useState(new Set());

    useEffect(() => { if (domainId) loadPosts(); }, [domainId]);

    async function loadPosts() {
        try {
            setLoading(true);
            const data = await getPostDrafts(domainId);
            setPosts(data);
        } catch (err) {
            console.error('Failed to load posts:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSavePost(postId, updates) {
        try {
            await updatePostDraft(postId, updates);
            setEditingPost(null);
            await loadPosts();
        } catch (err) {
            alert('Save failed: ' + err.message);
        }
    }

    async function handleBulkAction(status) {
        if (selectedIds.size === 0) return;
        try {
            await bulkUpdateStatus([...selectedIds], status);
            setSelectedIds(new Set());
            await loadPosts();
        } catch (err) {
            alert('Bulk action failed: ' + err.message);
        }
    }

    function toggleSelect(id) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleSelectAll() {
        if (selectedIds.size === filteredPosts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredPosts.map(p => p.id)));
        }
    }

    if (!domainId) {
        return (
            <div className="empty-state card">
                <div className="empty-state-icon">✏️</div>
                <h3 className="empty-state-title">No domain selected</h3>
                <p className="empty-state-text">Select a domain to view and edit post drafts.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="empty-state">
                <div className="spinner" style={{ width: 40, height: 40 }}></div>
                <p className="text-muted mt-4">Loading posts…</p>
            </div>
        );
    }

    const platforms = [...new Set(posts.map(p => p.platform))];
    const filteredPosts = posts.filter(p => {
        if (filterPlatform !== 'all' && p.platform !== filterPlatform) return false;
        if (filterStatus !== 'all' && p.status !== filterStatus) return false;
        return true;
    });

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Post Editor</h1>
                <p className="page-subtitle">{posts.length} total drafts · {filteredPosts.length} shown</p>
            </div>

            {/* Filters & Bulk Actions */}
            <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <div className="flex gap-2">
                    <select className="form-select" style={{ width: 'auto' }} value={filterPlatform}
                        onChange={e => setFilterPlatform(e.target.value)}>
                        <option value="all">All Platforms</option>
                        {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select className="form-select" style={{ width: 'auto' }} value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="approved">Approved</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                    </select>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex gap-2">
                        <span className="text-sm text-secondary">{selectedIds.size} selected</span>
                        <button className="btn btn-sm" style={{ background: 'rgba(0,184,148,0.15)', color: 'var(--success)', border: '1px solid rgba(0,184,148,0.3)' }}
                            onClick={() => handleBulkAction('approved')}>✓ Approve</button>
                        <button className="btn btn-sm" style={{ background: 'rgba(108,92,231,0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(108,92,231,0.3)' }}
                            onClick={() => handleBulkAction('scheduled')}>📌 Schedule</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleBulkAction('draft')}>↩ Reset to Draft</button>
                    </div>
                )}
            </div>

            {filteredPosts.length === 0 ? (
                <div className="empty-state card">
                    <div className="empty-state-icon">📝</div>
                    <h3 className="empty-state-title">No posts found</h3>
                    <p className="empty-state-text">Generate posts by running the pipeline, or adjust your filters.</p>
                </div>
            ) : (
                <div className="flex-col gap-3">
                    {/* Select All */}
                    <div className="flex items-center gap-3" style={{ padding: '0 var(--space-4)' }}>
                        <input type="checkbox" checked={selectedIds.size === filteredPosts.length && filteredPosts.length > 0}
                            onChange={toggleSelectAll} style={{ accentColor: 'var(--accent-primary)' }} />
                        <span className="text-xs text-muted">Select All</span>
                    </div>

                    {filteredPosts.map(post => (
                        <div key={post.id} className="card" style={{ padding: 'var(--space-4) var(--space-5)' }}>
                            <div className="flex items-center gap-4">
                                <input type="checkbox" checked={selectedIds.has(post.id)}
                                    onChange={() => toggleSelect(post.id)}
                                    style={{ accentColor: 'var(--accent-primary)', flexShrink: 0 }} />

                                <div className="flex items-center gap-2" style={{ minWidth: 90 }}>
                                    <span className={`badge badge-platform badge-${post.platform}`}>
                                        {PLATFORM_ICONS[post.platform] || '•'} {post.platform}
                                    </span>
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="text-sm" style={{ marginBottom: 4 }}>
                                        {post.text_content
                                            ? post.text_content.length > 120 ? post.text_content.slice(0, 120) + '…' : post.text_content
                                            : <span className="text-muted">No content yet</span>}
                                    </div>
                                    <div className="flex gap-3 text-xs text-muted">
                                        {post.scheduled_date && <span>📅 {post.scheduled_date}</span>}
                                        {post.scheduled_time && <span>🕐 {post.scheduled_time}</span>}
                                        {post.target_url && <span>🔗 {post.target_url}</span>}
                                        {post.hashtags?.length > 0 && <span>#{post.hashtags.length} tags</span>}
                                    </div>
                                </div>

                                <span className={`badge badge-${post.status}`}>{post.status}</span>

                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingPost(post)}>
                                    ✏️ Edit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editingPost && (
                <EditPostModal
                    post={editingPost}
                    onClose={() => setEditingPost(null)}
                    onSave={(updates) => handleSavePost(editingPost.id, updates)}
                />
            )}
        </div>
    );
}

function EditPostModal({ post, onClose, onSave }) {
    const [form, setForm] = useState({
        textContent: post.text_content || '',
        scheduledDate: post.scheduled_date || '',
        scheduledTime: post.scheduled_time || '',
        platform: post.platform || '',
        targetUrl: post.target_url || '',
        cta: post.cta || '',
        status: post.status || 'draft',
        feedback: ''
    });

    function handleChange(e) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        onSave({
            textContent: form.textContent,
            scheduledDate: form.scheduledDate,
            scheduledTime: form.scheduledTime,
            platform: form.platform,
            targetUrl: form.targetUrl,
            cta: form.cta,
            status: form.status,
            feedback: form.feedback
        });
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Edit Post</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Post Content</label>
                        <textarea className="form-textarea" name="textContent" value={form.textContent}
                            onChange={handleChange} style={{ minHeight: 150 }} />
                        <div className="text-xs text-muted mt-4">{form.textContent.length} characters</div>
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-input" name="scheduledDate" value={form.scheduledDate}
                                onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Time</label>
                            <input type="time" className="form-input" name="scheduledTime" value={form.scheduledTime}
                                onChange={handleChange} />
                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Platform</label>
                            <select className="form-select" name="platform" value={form.platform} onChange={handleChange}>
                                <option value="twitter">Twitter / X</option>
                                <option value="facebook">Facebook</option>
                                <option value="instagram">Instagram</option>
                                <option value="linkedin">LinkedIn</option>
                                <option value="pinterest">Pinterest</option>
                                <option value="tiktok">TikTok</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-select" name="status" value={form.status} onChange={handleChange}>
                                <option value="draft">Draft</option>
                                <option value="approved">Approved</option>
                                <option value="scheduled">Scheduled</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Target URL</label>
                        <input className="form-input" name="targetUrl" value={form.targetUrl} onChange={handleChange}
                            placeholder="https://example.com/page" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">CTA</label>
                        <input className="form-input" name="cta" value={form.cta} onChange={handleChange}
                            placeholder="Call to action text" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Feedback for Regeneration</label>
                        <textarea className="form-textarea" name="feedback" value={form.feedback}
                            onChange={handleChange} placeholder="E.g. 'make it less salesy' or 'add more urgency'" style={{ minHeight: 60 }} />
                    </div>

                    {post.hashtags && post.hashtags.length > 0 && (
                        <div className="mb-4">
                            <span className="form-label">Hashtags</span>
                            <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: 4 }}>
                                {post.hashtags.map((tag, i) => (
                                    <span key={i} className="badge badge-scheduled">#{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {post.media_suggestions && post.media_suggestions.length > 0 && (
                        <div className="mb-4">
                            <span className="form-label">Media Suggestions</span>
                            {post.media_suggestions.map((m, i) => (
                                <div key={i} className="text-sm text-secondary" style={{ marginTop: 4 }}>
                                    📎 [{m.type}] {m.description} {m.textOverlay && `— "${m.textOverlay}"`}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3" style={{ justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">💾 Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
