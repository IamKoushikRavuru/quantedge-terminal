/**
 * Phase 13 — Signal Research (Experimental)
 * Read-only research signals derived from option structure.
 * NOT investment advice. NOT trading signals. Descriptive only.
 */
import { useState, useEffect, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────
type Severity = 'normal' | 'elevated' | 'stressed' | 'anomalous' | 'unavailable';
type Confidence = 'low' | 'medium' | 'high';
type Category = 'vol_structure' | 'positioning' | 'regime' | 'stress_anomaly';

interface Signal {
    id: string;
    name: string;
    category: Category;
    symbol: string;
    value: number | null;
    unit: string;
    severity: Severity;
    confidence: Confidence;
    interpretation: string;
    formula_summary: string;
    formula_latex: string;
    limitations: string;
    regime_sensitivity: string;
    disclaimer: string;
    computed_at: string;
    data_stale: boolean;
}

interface Summary {
    symbol: string;
    disclaimer: string;
    computed_at: string;
    signals: Signal[];
    data_stale: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SEVERITY_COLOR: Record<Severity, string> = {
    normal: '#00d4a0',
    elevated: '#f5a623',
    stressed: '#ff4d6d',
    anomalous: '#c77dff',
    unavailable: 'var(--text-muted)',
};
const CONF_COLOR: Record<Confidence, string> = {
    low: '#f5a623',
    medium: '#4d9fff',
    high: '#00d4a0',
};
const CAT_LABELS: Record<Category, string> = {
    vol_structure: 'Vol Structure',
    positioning: 'Positioning',
    regime: 'Regime',
    stress_anomaly: 'Stress & Anomaly',
};

// ── Shared inline styles ──────────────────────────────────────────────────────
const cardBase: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
};
const LABEL: React.CSSProperties = {
    fontSize: 9, fontFamily: "'Space Mono',monospace", letterSpacing: '0.12em',
    color: 'var(--text-muted)', textTransform: 'uppercase',
};
const MONO: React.CSSProperties = { fontFamily: "'Space Mono',monospace" };

// ── Signal Card ───────────────────────────────────────────────────────────────
function SignalCard({ sig }: { sig: Signal }) {
    const [expanded, setExpanded] = useState(false);
    const sc = SEVERITY_COLOR[sig.severity];
    const cc = CONF_COLOR[sig.confidence];

    const isClassUnit = sig.unit === 'class' || sig.unit === 'flag' || sig.unit === 'zone';
    const displayValue = sig.value !== null
        ? sig.value.toFixed(isClassUnit ? 0 : 3)
        : '—';

    return (
        <div style={{ ...cardBase, border: `1px solid ${sc}22`, position: 'relative', overflow: 'hidden' }}>
            {/* Left severity stripe */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: sc, borderRadius: '8px 0 0 8px' }} />

            <div style={{ paddingLeft: 10 }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ ...MONO, fontSize: 11, color: 'var(--text-primary)', fontWeight: 700, flex: 1 }}>
                        {sig.name}
                    </span>
                    <span
                        title={`Severity: ${sig.severity}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: `${sc}14`, border: `1px solid ${sc}30`, borderRadius: 3, fontSize: 9, ...MONO, color: sc, letterSpacing: '0.1em' }}
                    >
                        ● {sig.severity.toUpperCase()}
                    </span>
                    <span
                        title={`Analytical confidence: ${sig.confidence}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: `${cc}10`, border: `1px solid ${cc}25`, borderRadius: 3, fontSize: 9, ...MONO, color: cc, letterSpacing: '0.1em' }}
                    >
                        CONF {sig.confidence.toUpperCase()}
                    </span>
                    <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, fontSize: 9, ...MONO, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                        {CAT_LABELS[sig.category as Category] ?? sig.category}
                    </span>
                    {sig.data_stale && <span style={{ fontSize: 8, color: '#f5a623', ...MONO }}>STALE</span>}
                </div>

                {/* Value display */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 22, ...MONO, color: sc, fontWeight: 700 }}>{displayValue}</span>
                    {!isClassUnit && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', ...MONO }}>{sig.unit}</span>
                    )}
                </div>

                {/* Interpretation */}
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', ...MONO, lineHeight: 1.55, marginTop: 2 }}>
                    {sig.interpretation}
                </div>

                {/* Methodology toggle */}
                <button
                    onClick={() => setExpanded(e => !e)}
                    style={{ marginTop: 6, padding: '3px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, cursor: 'pointer', fontSize: 9, color: 'var(--text-muted)', ...MONO, letterSpacing: '0.08em' }}
                >
                    {expanded ? '▲ HIDE METHODOLOGY' : '▼ VIEW METHODOLOGY'}
                </button>

                {expanded && (
                    <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 5, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                            <div style={LABEL}>Formula</div>
                            <div style={{ fontSize: 10, ...MONO, color: '#4d9fff', marginTop: 2 }}>{sig.formula_summary}</div>
                        </div>
                        <div>
                            <div style={LABEL}>Regime Sensitivity</div>
                            <div style={{ fontSize: 10, ...MONO, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{sig.regime_sensitivity}</div>
                        </div>
                        <div>
                            <div style={LABEL}>Limitations</div>
                            <div style={{ fontSize: 10, ...MONO, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.5 }}>{sig.limitations}</div>
                        </div>
                        <div style={{ padding: '6px 10px', background: 'rgba(255,77,109,0.05)', border: '1px solid rgba(255,77,109,0.15)', borderRadius: 4, fontSize: 9, color: '#ff4d6d', ...MONO, lineHeight: 1.6 }}>
                            {sig.disclaimer}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Summary Bar ───────────────────────────────────────────────────────────────
function SummaryBar({ signals }: { signals: Signal[] }) {
    const counts: Record<Severity, number> = { normal: 0, elevated: 0, stressed: 0, anomalous: 0, unavailable: 0 };
    signals.forEach(s => { counts[s.severity] = (counts[s.severity] || 0) + 1; });
    return (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {(Object.entries(counts) as [Severity, number][]).filter(([, n]) => n > 0).map(([sev, n]) => (
                <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: `${SEVERITY_COLOR[sev]}10`, border: `1px solid ${SEVERITY_COLOR[sev]}25`, borderRadius: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: SEVERITY_COLOR[sev], flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 9, ...MONO, color: SEVERITY_COLOR[sev], letterSpacing: '0.1em' }}>{sev.toUpperCase()}</span>
                    <span style={{ fontSize: 11, ...MONO, color: 'var(--text-primary)', fontWeight: 700 }}>{n}</span>
                </div>
            ))}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const CATEGORIES: (Category | 'all')[] = ['all', 'vol_structure', 'positioning', 'regime', 'stress_anomaly'];
const CAT_TAB_LABELS: Record<string, string> = {
    all: 'All Signals',
    vol_structure: 'Vol Structure',
    positioning: 'Positioning',
    regime: 'Regime',
    stress_anomaly: 'Stress & Anomaly',
};
const SEV_FILTERS = ['all', 'normal', 'elevated', 'stressed', 'anomalous'] as const;

export default function SignalResearch() {
    const [sym, setSym] = useState('NIFTY');
    const [data, setData] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [catFilter, setCat] = useState<Category | 'all'>('all');
    const [sevFilter, setSev] = useState<Severity | 'all'>('all');

    const load = useCallback(async (symbol: string) => {
        setLoading(true); setErr(null);
        try {
            const r = await fetch(`/api/signals/summary?symbol=${symbol}`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            setData(await r.json());
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : 'Unknown error');
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(sym); }, [sym, load]);

    const visible = (data?.signals ?? []).filter(s =>
        (catFilter === 'all' || s.category === catFilter) &&
        (sevFilter === 'all' || s.severity === sevFilter)
    );

    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 9,
        ...MONO, letterSpacing: '0.1em', textTransform: 'uppercase',
        background: active ? 'rgba(0,212,160,0.1)' : 'transparent',
        color: active ? 'var(--green)' : 'var(--text-muted)',
        borderBottom: active ? '2px solid var(--green)' : '2px solid transparent',
    });

    return (
        <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Permanent disclaimer — cannot be dismissed */}
            <div style={{ padding: '10px 14px', background: 'rgba(255,77,109,0.07)', border: '1px solid rgba(255,77,109,0.28)', borderRadius: 6, fontSize: 10, color: '#ff4d6d', ...MONO, letterSpacing: '0.07em', lineHeight: 1.65 }}>
                ⚠ <strong>Analytical Only — Not Investment Advice.</strong> These signals describe statistical market conditions
                derived from NSE option chain data. They do NOT constitute a recommendation to buy, sell, or hold any instrument.
                Signals are experimental, descriptive, and not validated for trading use.
                Past structural conditions carry no guarantee of future outcomes.
                This layer is SEBI-compliant by design: no execution logic, no price prediction, no trading instructions.
            </div>

            {/* Controls row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={LABEL}>Symbol:</div>
                {(['NIFTY', 'BANKNIFTY', 'FINNIFTY'] as const).map(s => (
                    <button
                        key={s} onClick={() => setSym(s)}
                        style={{ padding: '5px 12px', border: `1px solid ${sym === s ? 'var(--green)' : 'var(--border)'}`, background: sym === s ? 'rgba(0,212,160,0.1)' : 'transparent', color: sym === s ? 'var(--green)' : 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', fontSize: 10, ...MONO }}
                    >{s}</button>
                ))}
                <button
                    onClick={() => load(sym)} disabled={loading}
                    style={{ marginLeft: 'auto', padding: '5px 14px', background: 'rgba(77,159,255,0.08)', border: '1px solid rgba(77,159,255,0.3)', borderRadius: 4, color: '#4d9fff', fontSize: 9, cursor: loading ? 'not-allowed' : 'pointer', ...MONO, letterSpacing: '0.08em' }}
                >
                    {loading ? '⟳ LOADING…' : '↻ REFRESH'}
                </button>
            </div>

            {/* Severity filter row */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={LABEL}>Filter severity:</span>
                {SEV_FILTERS.map(sv => {
                    const active = sevFilter === sv;
                    const col = sv === 'all' ? 'var(--green)' : SEVERITY_COLOR[sv as Severity];
                    return (
                        <button
                            key={sv} onClick={() => setSev(sv as Severity | 'all')}
                            style={{ padding: '3px 8px', border: `1px solid ${active ? col : 'var(--border)'}`, background: active ? 'rgba(255,255,255,0.05)' : 'transparent', color: active ? col : 'var(--text-muted)', borderRadius: 3, cursor: 'pointer', fontSize: 8, ...MONO, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                        >{sv}</button>
                    );
                })}
            </div>

            {/* Meta + summary bar */}
            {data && (
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', ...MONO }}>
                        Computed {data.computed_at.slice(0, 19).replace('T', ' ')} UTC
                        {data.data_stale && ' · ⚠ STALE DATA'}
                    </div>
                    <SummaryBar signals={data.signals} />
                </div>
            )}

            {/* Category tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
                {CATEGORIES.map(cat => (
                    <button key={cat} style={tabStyle(catFilter === cat)} onClick={() => setCat(cat)}>
                        {CAT_TAB_LABELS[cat]}
                        {data && cat !== 'all' && (
                            <span style={{ marginLeft: 5, opacity: 0.6 }}>
                                ({data.signals.filter(s => s.category === cat).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Error */}
            {err && (
                <div style={{ color: '#f5a623', fontSize: 10, ...MONO }}>
                    ⚠ {err} — NSE market may be closed or data unavailable
                </div>
            )}

            {/* Loading indicator */}
            {loading && (
                <div style={{ color: 'var(--text-muted)', fontSize: 11, ...MONO }}>
                    Computing signals from option chain…
                </div>
            )}

            {/* Signal grid */}
            {!loading && visible.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 12 }}>
                    {visible.map(sig => <SignalCard key={sig.id} sig={sig} />)}
                </div>
            )}

            {/* Empty state */}
            {!loading && visible.length === 0 && data && (
                <div style={{ ...cardBase, padding: 30, textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, ...MONO }}>No signals match the current filter.</div>
                </div>
            )}

            {/* Legend */}
            <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 5, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', ...MONO }}>CONFIDENCE (analytical quality, not probability of profit):</span>
                {(['low', 'medium', 'high'] as Confidence[]).map(c => (
                    <span key={c} style={{ fontSize: 9, color: CONF_COLOR[c], ...MONO, letterSpacing: '0.1em' }}>■ {c.toUpperCase()}</span>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', ...MONO }}>SEVERITY (structural intensity only, NOT directional):</span>
                {(['normal', 'elevated', 'stressed', 'anomalous'] as Severity[]).map(s => (
                    <span key={s} style={{ fontSize: 9, color: SEVERITY_COLOR[s], ...MONO, letterSpacing: '0.1em' }}>● {s.toUpperCase()}</span>
                ))}
            </div>
        </div>
    );
}
