/**
 * Phase 11 — Research Signal Candidates
 * Offline, read-only structural anomaly snapshots.
 * NOT trading signals. Research observations only.
 */
import { useState, useEffect } from 'react';

const DISCLAIMER = [
    "Research signal candidates only. These are structural observations — NOT trading signals.",
    "They represent conditions worth further research, not actionable entry or exit points.",
    "Structural anomalies can persist or intensify. Past observations carry no predictive guarantee.",
].join(" ");

const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 };
const labelStyle: React.CSSProperties = { fontSize: 9, fontFamily: "'Space Mono',monospace", letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 };

const SEV_COLOR: Record<string, string> = {
    elevated: '#f5a623',
    anomalous: '#ff4d6d',
    compressed: '#4d9fff',
    regime_shift: '#c77dff',
};

function SeverityBadge({ sev }: { sev: string }) {
    const color = SEV_COLOR[sev] ?? 'var(--text-muted)';
    return (
        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 3, fontSize: 9, fontFamily: "'Space Mono',monospace", letterSpacing: '0.12em', background: `${color}14`, color, border: `1px solid ${color}30`, whiteSpace: 'nowrap' }}>
            {sev.replace(/_/g, ' ').toUpperCase()}
        </span>
    );
}

interface Alert {
    id: string; symbol: string; category: string; severity: string;
    metric: string; value: number; threshold: number; triggered_at: string;
    explanation: string; why_not_trade: string;
}

function AlertRow({ alert, expanded, toggle }: { alert: Alert; expanded: boolean; toggle: () => void }) {
    const color = SEV_COLOR[alert.severity] ?? 'var(--text-muted)';
    return (
        <div style={{ border: `1px solid ${color}25`, borderRadius: 7, marginBottom: 10, overflow: 'hidden' }}>
            <div
                onClick={toggle}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', background: `${color}06`, transition: 'background 0.2s' }}
            >
                <SeverityBadge sev={alert.severity} />
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--text-primary)', flex: 1 }}>
                    [{alert.symbol}] {alert.metric}
                </div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color }}>
                    {typeof alert.value === 'number' ? alert.value.toFixed(2) : alert.value}
                    <span style={{ fontSize: 8, color: 'var(--text-muted)', marginLeft: 4 }}>threshold: {alert.threshold}</span>
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", whiteSpace: 'nowrap' }}>
                    {alert.triggered_at.slice(0, 16).replace('T', ' ')} UTC
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</div>
            </div>

            {expanded && (
                <div style={{ padding: '12px 14px 14px', borderTop: `1px solid ${color}20` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <div style={{ fontSize: 9, color, fontFamily: "'Space Mono',monospace", letterSpacing: '0.12em', marginBottom: 6 }}>OBSERVATION</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'Space Mono',monospace", lineHeight: 1.6 }}>
                                {alert.explanation}
                            </div>
                        </div>
                        <div style={{ padding: '8px 12px', background: 'rgba(255,77,109,0.05)', border: '1px solid rgba(255,77,109,0.15)', borderRadius: 5 }}>
                            <div style={{ fontSize: 9, color: '#ff4d6d', fontFamily: "'Space Mono',monospace", letterSpacing: '0.12em', marginBottom: 6 }}>WHY THIS IS NOT A TRADE</div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: "'Space Mono',monospace", lineHeight: 1.65 }}>
                                {alert.why_not_trade}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ResearchSignals() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [err, setErr] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');

    const fetch_ = async () => {
        setLoading(true); setErr(null);
        try {
            const r = await fetch('/api/research/alerts');
            if (!r.ok) throw new Error(`${r.status}`);
            setData(await r.json());
        } catch (e: any) { setErr(e.message); }
        setLoading(false);
    };

    const refresh = async () => {
        setRefreshing(true);
        try {
            await fetch('/api/research/refresh', { method: 'POST' });
            await fetch_();
        } catch { /* ignore */ }
        setRefreshing(false);
    };

    useEffect(() => { fetch_(); }, []);

    const toggle = (id: string) => setExpanded(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const alerts: Alert[] = data?.alerts ?? [];
    const filtered = filter === 'all' ? alerts : alerts.filter(a => a.symbol === filter || a.severity === filter || a.category === filter);
    const categories = [...new Set(alerts.map(a => a.category))];

    return (
        <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Permanent disclaimer banner */}
            <div style={{ padding: '10px 14px', background: 'rgba(255,77,109,0.07)', border: '1px solid rgba(255,77,109,0.25)', borderRadius: 6, fontSize: 10, color: '#ff4d6d', fontFamily: "'Space Mono',monospace", letterSpacing: '0.07em', lineHeight: 1.6 }}>
                ⚠ {DISCLAIMER}
            </div>

            {/* Header + controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', flex: 1 }}>
                    RESEARCH SIGNAL CANDIDATES — {alerts.length} condition{alerts.length !== 1 ? 's' : ''}
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 6 }}>
                    {['all', 'NIFTY', 'BANKNIFTY', ...categories].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 10px', border: `1px solid ${filter === f ? 'var(--green)' : 'var(--border)'}`, background: filter === f ? 'rgba(0,212,160,0.08)' : 'transparent', color: filter === f ? 'var(--green)' : 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', fontSize: 9, fontFamily: "'Space Mono',monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {f}
                        </button>
                    ))}
                </div>

                <button onClick={refresh} disabled={refreshing || loading} style={{ padding: '5px 14px', background: 'rgba(77,159,255,0.08)', border: '1px solid rgba(77,159,255,0.3)', borderRadius: 4, color: '#4d9fff', fontSize: 9, cursor: refreshing ? 'not-allowed' : 'pointer', fontFamily: "'Space Mono',monospace", letterSpacing: '0.08em' }}>
                    {refreshing ? '⟳ REFRESHING…' : '↻ REFRESH SNAPSHOT'}
                </button>
            </div>

            {/* Snapshot metadata */}
            {data && (
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>
                        SNAPSHOT: {data.computed_at?.replace('T', ' ').slice(0, 19)} UTC
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>
                        {data.note}
                    </div>
                </div>
            )}

            {/* Symbol summary cards */}
            {data?.summary && (
                <div style={{ display: 'flex', gap: 10 }}>
                    {Object.entries(data.summary).map(([sym, s]: [string, any]) => (
                        <div key={sym} style={{ ...cardStyle, flex: 1, padding: 12 }}>
                            <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.12em', marginBottom: 8 }}>{sym}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                                {[['SPOT', s.spot?.toLocaleString('en-IN')], ['ATM IV', `${s.atm_iv}%`], ['SKEW', `${s.skew_pct > 0 ? '+' : ''}${s.skew_pct}pp`]].map(([l, v]) => (
                                    <div key={l}><div style={labelStyle}>{l}</div><div style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: 'var(--text-primary)' }}>{v}</div></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {loading && <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'Space Mono',monospace" }}>Computing structural snapshots…</div>}
            {err && <div style={{ color: '#f5a623', fontSize: 10, fontFamily: "'Space Mono',monospace" }}>⚠ {err}</div>}

            {/* Alerts */}
            {!loading && filtered.length === 0 && (
                <div style={{ ...cardStyle, textAlign: 'center', padding: 30 }}>
                    <div style={{ color: '#00d4a0', fontSize: 14, fontFamily: "'Space Mono',monospace", marginBottom: 8 }}>✓ No structural anomalies detected</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: "'Space Mono',monospace" }}>All monitored metrics within normal historical ranges</div>
                </div>
            )}

            {!loading && filtered.map(alert => (
                <AlertRow key={alert.id} alert={alert} expanded={expanded.has(alert.id)} toggle={() => toggle(alert.id)} />
            ))}

            {/* Severity legend */}
            <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 5, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>SEVERITY SCALE:</span>
                {Object.entries(SEV_COLOR).map(([sev, color]) => (
                    <span key={sev} style={{ fontSize: 9, color, fontFamily: "'Space Mono',monospace", letterSpacing: '0.1em' }}>■ {sev.replace(/_/g, ' ').toUpperCase()}</span>
                ))}
            </div>
        </div>
    );
}
