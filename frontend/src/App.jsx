import React, { useState } from 'react';
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

    function handleSelectDomain(domainId) {
        setSelectedDomainId(domainId);
        setActiveView('calendar');
    }

    function renderPage() {
        switch (activeView) {
            case 'domains':
                return <DomainManager onSelectDomain={handleSelectDomain} />;
            case 'calendar':
                return <CalendarView domainId={selectedDomainId} onNavigate={setActiveView} />;
            case 'posts':
                return <PostEditor domainId={selectedDomainId} />;
            case 'personas':
                return <PersonaView domainId={selectedDomainId} />;
            case 'settings':
                return <Settings />;
            default:
                return <DomainManager onSelectDomain={handleSelectDomain} />;
        }
    }

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">S</div>
                    <h1>SMMA</h1>
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
                {selectedDomainId && (
                    <div style={{ marginTop: 'auto', padding: 'var(--space-3)', borderTop: '1px solid var(--bg-glass-border)' }}>
                        <span className="text-xs text-muted">Active Domain</span>
                        <div className="text-sm" style={{ marginTop: '4px', color: 'var(--accent-secondary)' }}>
                            {selectedDomainId.slice(0, 8)}…
                        </div>
                    </div>
                )}
            </aside>
            <main className="main-content">
                {renderPage()}
            </main>
        </div>
    );
}
