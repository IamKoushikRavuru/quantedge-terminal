import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import RightPanel from './RightPanel';
import AskTheGuide from '../guide/AskTheGuide';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const [showGuide, setShowGuide] = useState(false);

    // Auto-trigger tutorials for new features
    useEffect(() => {
        const path = location.pathname;
        if (path === '/' || path === '/dashboard' || path.startsWith('/login') || path === '/onboarding') return;

        try {
            const seenStr = localStorage.getItem('qe_tutorials_seen') || '[]';
            const seen = JSON.parse(seenStr) as string[];

            if (!seen.includes(path)) {
                // First time seeing this page! Auto open the guide.
                seen.push(path);
                localStorage.setItem('qe_tutorials_seen', JSON.stringify(seen));

                // Slight delay to let page transition finish
                setTimeout(() => setShowGuide(true), 600);
            }
        } catch {
            // ignore localStorage errors
        }
    }, [location.pathname]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-base)' }}>
            <Navbar />
            <div className="app-shell" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <Sidebar />
                <div className="main-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', position: 'relative' }}>
                    {children}
                </div>
                <div className="hide-on-tablet">
                    <RightPanel />
                </div>
            </div>

            {/* Persistent Global Guide */}
            {showGuide ? (
                <AskTheGuide
                    context={location.pathname}
                    onDismiss={() => setShowGuide(false)}
                />
            ) : (
                <button
                    onClick={() => setShowGuide(true)}
                    style={{
                        position: 'fixed', bottom: 24, right: 24, zIndex: 8999,
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'var(--bg-elevated)', border: '1px solid rgba(0,212,160,0.5)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', color: 'var(--green)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                    title="Ask the Guide"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={22} height={22}>
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                </button>
            )}
        </div>
    );
}
