import { useState, useEffect } from 'react';
import { fetchMarketOverview } from '../../api/client';
import type { MarketStatus } from '../../types';

function ISTClock() {
    const [clock, setClock] = useState('--:--:-- IST');
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
            const h = String(ist.getUTCHours()).padStart(2, '0');
            const m = String(ist.getUTCMinutes()).padStart(2, '0');
            const s = String(ist.getUTCSeconds()).padStart(2, '0');
            setClock(`${h}:${m}:${s} IST`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);
    return <span className="neutral mono">{clock}</span>;
}

const STATUS_CONFIG: Record<MarketStatus, { label: string; color: string; dot: boolean }> = {
    LIVE: { label: 'MARKET LIVE', color: 'var(--green)', dot: true },
    PRE_OPEN: { label: 'PRE-OPEN', color: 'var(--amber)', dot: true },
    CLOSED: { label: 'MARKET CLOSED', color: 'var(--text-muted)', dot: false },
    POST_CLOSE: { label: 'POST-CLOSE', color: 'var(--text-muted)', dot: false },
};

export default function StatusBar() {
    const [status, setStatus] = useState<MarketStatus>('CLOSED');
    const [expiry, setExpiry] = useState('LOADING…');
    const [timeToExp, setTimeToExp] = useState('');

    useEffect(() => {
        const load = () => {
            fetchMarketOverview()
                .then(d => {
                    setStatus(d.marketStatus);
                    // nextExpiryLabel comes from backend (e.g. '27 FEB 2025')
                    const label = (d as any).nextExpiryLabel ?? d.context?.nextExpiryDate ?? '—';
                    setExpiry(label);
                    setTimeToExp(d.context?.timeToExpiry ?? '');
                })
                .catch(() => { });
        };
        load();
        // Refresh market status every 60 s
        const id = setInterval(load, 60_000);
        return () => clearInterval(id);
    }, []);

    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.CLOSED;

    return (
        <div style={{
            height: 36, background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 20,
            fontSize: 11, fontFamily: "'Space Mono', monospace", color: 'var(--text-secondary)', flexShrink: 0,
        }}>
            {/* Market status indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: cfg.color }}>
                {cfg.dot && <div className="pulse-dot" style={{ background: cfg.color }} />}
                <span>{cfg.label}</span>
            </div>

            <span className="neutral">NSE · BSE</span>
            <ISTClock />
            <span className="neutral">|</span>
            <span className="badge badge-muted">NSE DATA v2.4</span>
            <span className="badge badge-blue">BLACK-SCHOLES ACTIVE</span>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
                <span className="badge badge-green">EXPIRY: {expiry}</span>
                {timeToExp && timeToExp !== 'EXPIRED' && (
                    <span className="badge badge-amber">T-{timeToExp}</span>
                )}
                <span className="badge badge-amber">VIX 14.8</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 9, letterSpacing: '0.03em' }}>
                    ANALYTICAL ONLY · NOT INVESTMENT ADVICE
                </span>
            </div>
        </div>
    );
}
