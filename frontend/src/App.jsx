import React, { useState, useEffect } from 'react';
import { getDomains } from './api/client.js';
import DomainManager from './pages/DomainManager.jsx';
import CalendarView from './pages/CalendarView.jsx';
import PostEditor from './pages/PostEditor.jsx';
import Settings from './pages/Settings.jsx';
import PersonaView from './pages/PersonaView.jsx';

const NAV_ITEMS = [
    { id: 'domains', label: 'Domains', icon: '🌐' },
    { id: 'personas', label: 'Personas', icon: '🎭' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'posts', label: 'Post Editor', icon: '✏️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
    const [activeView, setActiveView] = useState('domains');
    const [selectedDomainId, setSelectedDomainId] = useState(null);
    const [domains, setDomains] = useState([]);

    useEffect(() => { loadDomains(); }, []);

    async function loadDomains() {
        try {
            const data = await getDomains();
            setDomains(data);
            // Auto-select first domain if none selected and domains exist
            if (!selectedDomainId && data.length > 0) {
                setSelectedDomainId(data[0].id);
            }
        } catch (err) {
            console.error('Failed to load domains in App:', err);
        }
    }

    function handleSelectDomain(domainId) {
        setSelectedDomainId(domainId);
        setActiveView('calendar');
    }

    function renderPage() {
        switch (activeView) {
            case 'domains':
                return <DomainManager onSelectDomain={handleSelectDomain} onDomainChange={loadDomains} />;
            case 'calendar':
                return <CalendarView domainId={selectedDomainId} onNavigate={setActiveView} />;
            case 'posts':
                return <PostEditor domainId={selectedDomainId} />;
            case 'personas':
                return <PersonaView domainId={selectedDomainId} />;
            case 'settings':
                return <Settings />;
            default:
                return <DomainManager onSelectDomain={handleSelectDomain} onDomainChange={loadDomains} />;
        }
    }

    const selectedDomain = domains.find(d => d.id === selectedDomainId);

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">S</div>
                    <h1>SMMA</h1>
                </div>

                {/* Domain Selector */}
                <div className="px-4 mb-6">
                    <label className="text-xs text-muted uppercase tracking-wider font-semibold mb-2 block">Active Domain</label>
                    <div className="relative">
                        <select
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-accent-primary"
                            value={selectedDomainId || ''}
                            onChange={(e) => setSelectedDomainId(e.target.value)}
                            style={{ backgroundImage: 'none' }}
                        >
                            <option value="" disabled>Select Domain</option>
                            {domains.map(d => (
                                <option key={d.id} value={d.id} className="text-black">
                                    {d.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted text-xs">
                            ▼
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            className={`sidebar-nav-item ${activeView === item.id ? 'active' : ''}`}
                            onClick={() => setActiveView(item.id)}
                        >
                            <span className="icon">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {selectedDomain ? (
                        <div className="text-xs text-muted">
                            <div>Working on:</div>
                            <div className="text-accent-primary font-medium truncate">{selectedDomain.name}</div>
                        </div>
                    ) : (
                        <div className="text-xs text-muted italic">No domain selected</div>
                    )}
                </div>
            </aside>
            <main className="main-content">
                {renderPage()}
            </main>
        </div>
    );
}
