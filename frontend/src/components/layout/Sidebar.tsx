import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV = [
    {
        path: '/dashboard', label: 'Dashboard', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>)
    },
    {
        path: '/chain', label: 'Option Chain', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <path d="M3 6h18M3 12h18M3 18h18" /><circle cx="7" cy="6" r="2" fill="currentColor" />
                <circle cx="12" cy="12" r="2" fill="currentColor" /><circle cx="9" cy="18" r="2" fill="currentColor" />
            </svg>)
    },
    {
        path: '/surface', label: 'Volatility Surface', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <path d="M2 20 Q6 8 12 10 Q18 12 22 4" /><path d="M2 20 Q8 16 12 18 Q17 20 22 14" opacity="0.5" />
                <path d="M4 20 L4 4M4 4 L2 6M4 4 L6 6" strokeWidth="1" />
            </svg>)
    },
    null, // divider
    {
        path: '/models', label: 'Model Comparison', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <rect x="2" y="14" width="5" height="8" rx="1" /><rect x="9.5" y="9" width="5" height="13" rx="1" />
                <rect x="17" y="4" width="5" height="18" rx="1" />
            </svg>)
    },
    {
        path: '/ml', label: 'ML Insights', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <circle cx="12" cy="12" r="3" /><circle cx="4" cy="6" r="2" /><circle cx="20" cy="6" r="2" />
                <circle cx="4" cy="18" r="2" /><circle cx="20" cy="18" r="2" />
                <path d="M6 6.5 L10 10M18 6.5 L14 10M6 17.5 L10 14M18 17.5 L14 14" />
            </svg>)
    },
    null, // ── Phase 11 divider ──
    {
        path: '/market-structure', label: 'Market Structure', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <rect x="2" y="16" width="4" height="6" rx="1" /><rect x="10" y="10" width="4" height="12" rx="1" />
                <rect x="18" y="4" width="4" height="18" rx="1" />
                <path d="M4 10 L12 6 L20 2" strokeWidth="1" strokeDasharray="2 2" />
            </svg>)
    },
    {
        path: '/scenario', label: 'Scenario Lab', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <path d="M6 3v12" /><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                <path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                <path d="M15 6H9m3 7.5 3-3" /><path d="M15 18H9" />
            </svg>)
    },
    {
        path: '/research', label: 'Research Signals', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                <path d="M11 8v3M11 14h.01" strokeWidth="2" strokeLinecap="round" />
            </svg>)
    },
    {
        path: '/signals', label: 'Signal Research', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <path d="M2 12 Q5 4 8 12 Q11 20 14 12 Q17 4 20 12" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="22" cy="12" r="1.5" fill="currentColor" />
            </svg>)
    },
    {
        path: '/sandbox', label: 'Execution Sandbox', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <path d="M9 3h6M9 3v5l-4 6a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 14l-4-6V3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 16h10" strokeLinecap="round" />
            </svg>)
    },
    {
        path: '/guide', label: 'QuantEdge Guide', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
                <path d="M9 7h6M9 11h4" strokeLinecap="round" />
            </svg>)
    },
    null, // divider
    {
        path: '/settings', label: 'Platform Settings', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>)
    },
    {
        path: '/developer', label: 'Developer Info', icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
            </svg>)
    }
] as const;

const navItemStyle = (isActive: boolean): React.CSSProperties => ({
    width: 38, height: 38, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', textDecoration: 'none', position: 'relative',
    color: isActive ? 'var(--green)' : 'var(--text-muted)',
    border: `1px solid ${isActive ? 'rgba(0,212,160,0.2)' : 'transparent'}`,
    background: isActive ? 'var(--bg-card)' : 'transparent',
    transition: 'all 0.2s ease',
});

const iconBtnStyle: React.CSSProperties = {
    width: 38, height: 38, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', border: 'none', background: 'transparent',
    color: 'var(--text-muted)', transition: 'all 0.2s ease', position: 'relative',
};

export default function Sidebar() {
    const [tooltip, setTooltip] = useState<string | null>(null);
    const { clearAuth, user } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        clearAuth();
        navigate('/', { replace: true });
    }

    return (
        <nav className="sidebar-nav">
            {/* Home / Logo */}
            <button
                onClick={() => navigate('/')}
                onMouseEnter={() => setTooltip('Home')}
                onMouseLeave={() => setTooltip(null)}
                title="Home"
                style={{ ...iconBtnStyle, marginBottom: 8, width: 40, height: 40, padding: 3 }}
            >
                <img src="/logo.jpg" alt="QuantEdge" style={{ width: 34, height: 34, borderRadius: 4, objectFit: 'cover', objectPosition: 'center' }} />
                {tooltip === 'Home' && <Tooltip label="← Home" />}
            </button>

            {NAV.map((item, i) => {
                if (!item) return <div key={i} style={{ width: 24, height: 1, background: 'var(--border)', margin: '8px 0' }} />;
                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => navItemStyle(isActive)}
                        onMouseEnter={() => setTooltip(item.label)}
                        onMouseLeave={() => setTooltip(null)}
                    >
                        {item.icon}
                        {tooltip === item.label && <Tooltip label={item.label} />}
                    </NavLink>
                );
            })}

            {/* Bottom: user avatar + logout */}
            <div className="sidebar-bottom">
                {/* User avatar → Profile */}
                <button
                    onClick={() => navigate('/profile')}
                    onMouseEnter={() => setTooltip('user')}
                    onMouseLeave={() => setTooltip(null)}
                    title="View Profile"
                    style={{ ...iconBtnStyle, opacity: 0.7 }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}>
                        <circle cx="12" cy="8" r="4" /><path d="M4 20 Q4 14 12 14 Q20 14 20 20" />
                    </svg>
                    {tooltip === 'user' && (
                        <span style={{
                            position: 'absolute', left: 48, bottom: 0,
                            background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
                            padding: '6px 10px', borderRadius: 4, fontSize: 10, whiteSpace: 'nowrap',
                            color: 'var(--text-primary)', fontFamily: "'Space Mono', monospace",
                            pointerEvents: 'none', zIndex: 100,
                        }}>
                            {user?.email ?? 'Profile'}
                        </span>
                    )}
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    onMouseEnter={() => setTooltip('logout')}
                    onMouseLeave={() => setTooltip(null)}
                    title="Logout"
                    style={{ ...iconBtnStyle, color: 'var(--text-muted)' }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={15} height={15}>
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    {tooltip === 'logout' && <Tooltip label="Logout" />}
                </button>
            </div>
        </nav>
    );
}

function Tooltip({ label }: { label: string }) {
    return (
        <span className="sidebar-tooltip" style={{
            position: 'absolute', left: 48, top: '50%', transform: 'translateY(-50%)',
            background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
            padding: '4px 10px', borderRadius: 4, fontSize: 11, whiteSpace: 'nowrap',
            color: 'var(--text-primary)', fontFamily: "'Space Mono', monospace",
            pointerEvents: 'none', zIndex: 100, animation: 'fadeIn 0.15s ease',
        }}>{label}</span>
    );
}
