import React, { useState, useEffect } from 'react';
import { getPostDrafts, getAgentData } from '../api/client.js';

const PLATFORM_COLORS = {
    twitter: 'var(--twitter)', facebook: 'var(--facebook)', instagram: 'var(--instagram)',
    linkedin: 'var(--linkedin)', pinterest: 'var(--pinterest)', tiktok: 'var(--tiktok)'
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ domainId, onNavigate }) {
    const [posts, setPosts] = useState([]);
    const [calendar, setCalendar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterPlatform, setFilterPlatform] = useState('all');
    const [viewMode, setViewMode] = useState('calendar'); // calendar | list

    useEffect(() => {
        if (domainId) loadData();
    }, [domainId]);

    async function loadData() {
        try {
            setLoading(true);
            const [postsData, calendarData] = await Promise.all([
                getPostDrafts(domainId).catch(() => []),
                getAgentData('campaign_calendars', domainId).catch(() => null)
            ]);
            setPosts(postsData);
            setCalendar(calendarData);
        } catch (err) {
            console.error('Failed to load calendar data:', err);
        } finally {
            setLoading(false);
        }
    }

    if (!domainId) {
        return (
            <div className="empty-state card">
                <div className="empty-state-icon">📅</div>
                <h3 className="empty-state-title">No domain selected</h3>
                <p className="empty-state-text">Select a domain from the Domains page to view its campaign calendar.</p>
                <button className="btn btn-primary" onClick={() => onNavigate('domains')}>Go to Domains</button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="empty-state">
                <div className="spinner" style={{ width: 40, height: 40 }}></div>
                <p className="text-muted mt-4">Loading calendar…</p>
            </div>
        );
    }

    const filteredPosts = filterPlatform === 'all' ? posts : posts.filter(p => p.platform === filterPlatform);
    const platforms = [...new Set(posts.map(p => p.platform))];

    // Build calendar grid
    const postsByDate = {};
    filteredPosts.forEach(p => {
        const date = p.scheduled_date || 'unscheduled';
        if (!postsByDate[date]) postsByDate[date] = [];
        postsByDate[date].push(p);
    });

    const dates = Object.keys(postsByDate).filter(d => d !== 'unscheduled').sort();
    const startDate = calendar?.startDate || dates[0] || new Date().toISOString().split('T')[0];
    const calendarDays = generateCalendarDays(startDate, 30);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Campaign Calendar</h1>
                <p className="page-subtitle">
                    {calendar ? `${calendar.startDate} → ${calendar.endDate}` : '30-day campaign view'}
                    {' · '}{filteredPosts.length} posts
                </p>
            </div>

            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2">
                    <button className={`btn btn-sm ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setViewMode('calendar')}>📅 Calendar</button>
                    <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setViewMode('list')}>📋 List</button>
                </div>
                <div className="flex gap-2">
                    <select className="form-select" style={{ width: 'auto' }} value={filterPlatform}
                        onChange={e => setFilterPlatform(e.target.value)}>
                        <option value="all">All Platforms</option>
                        {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('posts')}>
                        ✏️ Edit Posts
                    </button>
                </div>
            </div>

            {posts.length === 0 ? (
                <div className="empty-state card">
                    <div className="empty-state-icon">📭</div>
                    <h3 className="empty-state-title">No posts yet</h3>
                    <p className="empty-state-text">Run the analysis pipeline from the Domains page to generate your campaign calendar and post drafts.</p>
                </div>
            ) : viewMode === 'calendar' ? (
                <div>
                    <div className="calendar-grid">
                        {DAYS_OF_WEEK.map(day => (
                            <div key={day} className="calendar-day-header">{day}</div>
                        ))}
                        {calendarDays.map((day, i) => {
                            const dayPosts = postsByDate[day.date] || [];
                            return (
                                <div key={i} className={`calendar-day ${day.isPlaceholder ? 'text-muted' : ''}`}
                                    style={day.isPlaceholder ? { opacity: 0.3 } : {}}>
                                    <div className="calendar-day-number">{day.dayNum}</div>
                                    {dayPosts.slice(0, 4).map((post, j) => (
                                        <div key={j} className="calendar-post-item"
                                            style={{
                                                background: `${PLATFORM_COLORS[post.platform] || 'var(--text-muted)'}22`,
                                                color: PLATFORM_COLORS[post.platform] || 'var(--text-secondary)', borderLeft: `2px solid ${PLATFORM_COLORS[post.platform] || 'var(--text-muted)'}`
                                            }}>
                                            {post.scheduled_time || ''} {post.platform?.slice(0, 2).toUpperCase()}
                                        </div>
                                    ))}
                                    {dayPosts.length > 4 && (
                                        <div className="text-xs text-muted" style={{ textAlign: 'center' }}>+{dayPosts.length - 4}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex gap-4 mt-6" style={{ flexWrap: 'wrap' }}>
                        {platforms.map(p => (
                            <div key={p} className="flex items-center gap-2 text-xs">
                                <span className="calendar-post-dot" style={{ background: PLATFORM_COLORS[p] }}></span>
                                {p}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Platform</th>
                                <th>Content</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPosts.map(post => (
                                <tr key={post.id}>
                                    <td>{post.scheduled_date || '—'}</td>
                                    <td>{post.scheduled_time || '—'}</td>
                                    <td>
                                        <span className={`badge badge-platform badge-${post.platform}`}>{post.platform}</span>
                                    </td>
                                    <td style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {post.text_content || post.notes || '—'}
                                    </td>
                                    <td><span className={`badge badge-${post.status}`}>{post.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Status summary */}
            {posts.length > 0 && (
                <div className="grid-3 mt-6">
                    {['draft', 'approved', 'scheduled', 'published'].map(status => {
                        const count = posts.filter(p => p.status === status).length;
                        return (
                            <div key={status} className="card" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                                <div className="text-xs text-muted" style={{ textTransform: 'uppercase', marginBottom: '4px' }}>{status}</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: `var(--status-${status})` }}>{count}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function generateCalendarDays(startDate, numDays) {
    const days = [];
    const start = new Date(startDate + 'T00:00:00');

    // Add placeholder days for the start of the week
    const startDow = start.getDay();
    for (let i = 0; i < startDow; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() - (startDow - i));
        days.push({ date: d.toISOString().split('T')[0], dayNum: d.getDate(), isPlaceholder: true });
    }

    for (let i = 0; i < numDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        days.push({ date: d.toISOString().split('T')[0], dayNum: d.getDate(), isPlaceholder: false });
    }

    // Pad end to complete the week
    while (days.length % 7 !== 0) {
        const last = new Date(days[days.length - 1].date + 'T00:00:00');
        last.setDate(last.getDate() + 1);
        days.push({ date: last.toISOString().split('T')[0], dayNum: last.getDate(), isPlaceholder: true });
    }

    return days;
}
