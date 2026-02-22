/**
 * Phase 14 — Execution Sandbox (Experimental)
 * -----------------------------------------------
 * Simulates hypothetical order execution mechanics and risk constraint enforcement.
 * NOT a trading system. NOT investment advice. NOT performance evaluation.
 *
 * UI Language Rules:
 *  - "SIMULATE ORDER" (never "Trade", "Execute", "Buy", "Sell")
 *  - "EXPOSURE CHANGE" (never "Profit", "Return")
 *  - "REJECTED" / "PARTIAL FILL" / "FILLED" (structural status only)
 */
import { useState, useCallback } from 'react';
import { getToken } from '../hooks/useAuth';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RiskViolation { constraint: string; current_value: number; cap: number; explanation: string; }
interface GreeksExposure { delta: number; gamma: number; vega: number; theta: number; }
interface SlippageDetail { spread_component: number; size_component: number; total_slippage: number; order_type_factor: number; }
interface TraceStep { step: string; timestamp_offset_ms: number; status: 'ok' | 'warning' | 'rejected' | 'info'; detail: string; }
interface SimulationResult {
    order_id: string; status: 'FILLED' | 'PARTIAL_FILL' | 'REJECTED' | 'LIMIT_NOT_MET';
    fill_ratio: number; filled_quantity: number; avg_slippage: number;
    slippage_detail: SlippageDetail; latency_bucket: string;
    exposure_before: GreeksExposure; exposure_after: GreeksExposure;
    violations: RiskViolation[]; execution_trace: TraceStep[];
    fill_probability: number; oi_depth_proxy: number;
    disclaimer: string; simulated_at: string;
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const MONO: React.CSSProperties = { fontFamily: "'Space Mono',monospace" };
const CARD: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 };
const LABEL: React.CSSProperties = { fontSize: 9, ...{ fontFamily: "'Space Mono',monospace" }, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 4 };
const INPUT: React.CSSProperties = { padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: 'var(--text-primary)', fontSize: 11, fontFamily: "'Space Mono',monospace", outline: 'none', width: '100%' };

const STATUS_COLOR: Record<string, string> = {
    FILLED: '#00d4a0',
    PARTIAL_FILL: '#f5a623',
    REJECTED: '#ff4d6d',
    LIMIT_NOT_MET: '#c77dff',
};
const TRACE_COLOR: Record<string, string> = {
    ok: '#00d4a0',
    warning: '#f5a623',
    rejected: '#ff4d6d',
    info: 'var(--text-muted)',
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function RiskMeter({ label, before, after, cap }: { label: string; before: number; after: number; cap: number }) {
    const pBefore = Math.min(Math.abs(before) / cap, 1) * 100;
    const pAfter = Math.min(Math.abs(after) / cap, 1) * 100;
    const exceeded = Math.abs(after) > cap;
    const barColor = exceeded ? '#ff4d6d' : pAfter > 70 ? '#f5a623' : '#00d4a0';
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={LABEL}>{label}</span>
                <span style={{ fontSize: 9, ...MONO, color: barColor }}>
                    {Math.abs(after).toFixed(4)} / {cap.toFixed(2)} cap
                    {exceeded && ' ⚠ EXCEEDED'}
                </span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                {/* Before bar (grey) */}
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pBefore}%`, background: 'rgba(255,255,255,0.2)', borderRadius: 4, transition: 'width 0.4s ease' }} />
                {/* After bar (colored) */}
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pAfter}%`, background: barColor, borderRadius: 4, transition: 'width 0.4s ease', opacity: 0.85 }} />
                {/* Cap marker */}
                <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 2, background: 'rgba(255,255,255,0.3)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 8, ...MONO, color: 'var(--text-muted)' }}>
                <span>Before: {Math.abs(before).toFixed(4)}</span>
                <span>After: {Math.abs(after).toFixed(4)}</span>
            </div>
        </div>
    );
}

function ViolationCard({ v }: { v: RiskViolation }) {
    return (
        <div style={{ padding: '10px 14px', background: 'rgba(255,77,109,0.07)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 6, marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 9, ...MONO, color: '#ff4d6d', letterSpacing: '0.12em', fontWeight: 700 }}>
                    ✗ {v.constraint.toUpperCase().replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 9, ...MONO, color: '#f5a623' }}>
                    {v.current_value.toFixed(4)} → cap {v.cap.toFixed(4)}
                </span>
            </div>
            <div style={{ fontSize: 10, ...MONO, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{v.explanation}</div>
        </div>
    );
}

function TraceTimeline({ steps }: { steps: TraceStep[] }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 8, ...MONO, color: 'var(--text-muted)', minWidth: 52, paddingTop: 2, textAlign: 'right' }}>+{s.timestamp_offset_ms}ms</span>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: TRACE_COLOR[s.status], flexShrink: 0, marginTop: 3 }} />
                    <div>
                        <span style={{ fontSize: 9, ...MONO, color: TRACE_COLOR[s.status], letterSpacing: '0.08em' }}>{s.step.replace(/_/g, ' ')}</span>
                        <div style={{ fontSize: 9, ...MONO, color: 'var(--text-muted)', lineHeight: 1.55 }}>{s.detail}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function FillGauge({ ratio, status }: { ratio: number; status: string }) {
    const color = STATUS_COLOR[status] ?? 'var(--text-muted)';
    const pct = (ratio * 100).toFixed(1);
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={LABEL}>Fill Ratio</div>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0' }}>
                <svg width={80} height={80} viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
                        strokeDasharray={`${ratio * 201} 201`} strokeLinecap="round"
                        transform="rotate(-90 40 40)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
                </svg>
                <span style={{ position: 'absolute', fontSize: 15, ...MONO, color, fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ fontSize: 11, ...MONO, color, fontWeight: 700, letterSpacing: '0.1em' }}>{status.replace(/_/g, ' ')}</div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExecutionSandbox() {
    const [instrument, setInstrument] = useState('NIFTY');
    const [optType, setOptType] = useState<'CE' | 'PE'>('CE');
    const [strike, setStrike] = useState(22400);
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
    const [limitPrice, setLimitPrice] = useState<string>('');
    const [quantity, setQuantity] = useState(100);
    const [deltaCap, setDeltaCap] = useState(0.50);
    const [vegaCap, setVegaCap] = useState(0.30);
    const [gammaCap, setGammaCap] = useState(0.10);
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const runSimulation = useCallback(async () => {
        setLoading(true); setErr(null);
        const token = getToken();
        const body: Record<string, unknown> = {
            instrument,
            option_type: optType,
            strike: +strike,
            expiry: '2026-02-27',   // nearest expiry proxy
            order_type: orderType,
            quantity: +quantity,
            timestamp: new Date().toISOString(),
            delta_cap: +deltaCap,
            vega_cap: +vegaCap,
            gamma_cap: +gammaCap,
        };
        if (orderType === 'limit' && limitPrice) body['limit_price'] = +limitPrice;
        try {
            const r = await fetch('/api/sandbox/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            if (!r.ok) { const e = await r.json(); throw new Error(e.detail ?? 'Simulation error'); }
            setResult(await r.json());
        } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Error'); }
        setLoading(false);
    }, [instrument, optType, strike, orderType, limitPrice, quantity, deltaCap, vegaCap, gammaCap]);

    const eb = result?.exposure_before ?? { delta: 0, gamma: 0, vega: 0, theta: 0 };
    const ea = result?.exposure_after ?? { delta: 0, gamma: 0, vega: 0, theta: 0 };

    const capRowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 };

    return (
        <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Permanent disclaimer */}
            <div style={{ padding: '10px 14px', background: 'rgba(255,77,109,0.07)', border: '1px solid rgba(255,77,109,0.28)', borderRadius: 6, fontSize: 10, color: '#ff4d6d', ...MONO, lineHeight: 1.65 }}>
                ⚠ <strong>Execution Sandbox — Research Only.</strong> This module simulates order mechanics for research purposes only.
                No trading, advice, or performance evaluation is provided or implied.
                Simulation outputs describe hypothetical execution behaviour — not actual or expected financial outcomes.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>

                {/* ── Left: Order Form ─────────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={CARD}>
                        <div style={{ fontSize: 10, color: 'var(--green)', ...MONO, letterSpacing: '0.15em', marginBottom: 12 }}>HYPOTHETICAL ORDER</div>

                        <div style={capRowStyle}>
                            <div>
                                <div style={LABEL}>Instrument</div>
                                <select value={instrument} onChange={e => setInstrument(e.target.value)} style={INPUT}>
                                    {['NIFTY', 'BANKNIFTY', 'FINNIFTY'].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <div style={LABEL}>Option Type</div>
                                <select value={optType} onChange={e => setOptType(e.target.value as 'CE' | 'PE')} style={INPUT}>
                                    <option value="CE">CE (Call)</option>
                                    <option value="PE">PE (Put)</option>
                                </select>
                            </div>
                        </div>

                        <div style={capRowStyle}>
                            <div>
                                <div style={LABEL}>Strike</div>
                                <input type="number" value={strike} onChange={e => setStrike(+e.target.value)} style={INPUT} step={50} />
                            </div>
                            <div>
                                <div style={LABEL}>Order Type</div>
                                <select value={orderType} onChange={e => setOrderType(e.target.value as 'market' | 'limit')} style={INPUT}>
                                    <option value="market">Market</option>
                                    <option value="limit">Limit</option>
                                </select>
                            </div>
                        </div>

                        {orderType === 'limit' && (
                            <div style={{ marginBottom: 8 }}>
                                <div style={LABEL}>Limit Price (₹)</div>
                                <input type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} style={INPUT} placeholder="Enter limit price" />
                            </div>
                        )}

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <div style={LABEL}>Quantity (units)</div>
                                <span style={{ fontSize: 11, ...MONO, color: 'var(--text-primary)', fontWeight: 700 }}>{quantity.toLocaleString()}</span>
                            </div>
                            <input type="range" min={1} max={10000} value={quantity} onChange={e => setQuantity(+e.target.value)} style={{ width: '100%', accentColor: 'var(--green)' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, ...MONO, color: 'var(--text-muted)' }}>
                                <span>1</span><span>10,000 (hard cap)</span>
                            </div>
                        </div>
                    </div>

                    {/* Risk cap adjustments */}
                    <div style={CARD}>
                        <div style={{ fontSize: 10, color: '#f5a623', ...MONO, letterSpacing: '0.15em', marginBottom: 10 }}>RISK CAPS (adjustable)</div>

                        {([
                            ['Delta Cap (|Δ|)', deltaCap, setDeltaCap, 0.01, 0.80, 0.01],
                            ['Vega Cap (|ν|)', vegaCap, setVegaCap, 0.01, 0.60, 0.01],
                            ['Gamma Cap (|Γ|)', gammaCap, setGammaCap, 0.001, 0.25, 0.001],
                        ] as [string, number, React.Dispatch<React.SetStateAction<number>>, number, number, number][]).map(([lbl, val, setter, mn, mx, stp]) => (
                            <div key={lbl} style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={LABEL}>{lbl}</div>
                                    <span style={{ fontSize: 10, ...MONO, color: 'var(--text-primary)' }}>{val.toFixed(3)}</span>
                                </div>
                                <input type="range" min={mn} max={mx} step={stp} value={val}
                                    onChange={e => setter(+e.target.value)}
                                    style={{ width: '100%', accentColor: '#f5a623' }} />
                            </div>
                        ))}
                        <div style={{ fontSize: 8, color: 'var(--text-muted)', ...MONO, lineHeight: 1.6 }}>Notional cap: ₹10,00,000 (fixed). OI concentration cap: 50% (fixed).</div>
                    </div>

                    {/* Simulate button */}
                    <button
                        onClick={runSimulation} disabled={loading}
                        style={{ padding: '12px', background: loading ? 'rgba(255,255,255,0.03)' : 'rgba(0,212,160,0.1)', border: `1px solid ${loading ? 'rgba(255,255,255,0.1)' : 'rgba(0,212,160,0.4)'}`, borderRadius: 6, color: 'var(--green)', fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', ...MONO, letterSpacing: '0.12em', fontWeight: 700 }}
                    >
                        {loading ? '⟳ COMPUTING…' : '▶ SIMULATE ORDER'}
                    </button>
                    {err && <div style={{ color: '#ff4d6d', fontSize: 10, ...MONO }}> ⚠ {err}</div>}
                </div>

                {/* ── Right: Results ─────────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {!result && !loading && (
                        <div style={{ ...CARD, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, ...MONO, textAlign: 'center' }}>
                                Configure order parameters and click SIMULATE ORDER<br />
                                <span style={{ fontSize: 9, opacity: 0.6 }}>Execution mechanics + risk constraint diagnostics</span>
                            </div>
                        </div>
                    )}

                    {result && (
                        <>
                            {/* Status + Fill gauge */}
                            <div style={{ ...CARD, display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'start' }}>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--green)', ...MONO, letterSpacing: '0.15em', marginBottom: 8 }}>SIMULATION RESULT</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                        {[
                                            ['Filled Qty', `${result.filled_quantity} / ${quantity}`],
                                            ['Avg Slippage', `₹${result.avg_slippage.toFixed(3)}/unit`],
                                            ['Latency Bucket', result.latency_bucket],
                                            ['OI Depth Proxy', result.oi_depth_proxy.toLocaleString()],
                                            ['Fill Probability', `${(result.fill_probability * 100).toFixed(1)}%`],
                                            ['Violations', result.violations.length > 0 ? `${result.violations.length} ⚠` : '0 ✓'],
                                        ].map(([lbl, val]) => (
                                            <div key={lbl} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 5, padding: '8px 10px' }}>
                                                <div style={LABEL}>{lbl}</div>
                                                <div style={{ fontSize: 13, ...MONO, color: lbl === 'Violations' && result.violations.length > 0 ? '#ff4d6d' : 'var(--text-primary)', fontWeight: 700, marginTop: 2 }}>{val}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <FillGauge ratio={result.fill_ratio} status={result.status} />
                            </div>

                            {/* Slippage detail */}
                            <div style={CARD}>
                                <div style={{ fontSize: 10, color: 'var(--green)', ...MONO, letterSpacing: '0.15em', marginBottom: 8 }}>SLIPPAGE COMPONENTS</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                                    {[
                                        ['Spread Component', `₹${result.slippage_detail.spread_component.toFixed(4)}`],
                                        ['Size Component', `₹${result.slippage_detail.size_component.toFixed(4)}`],
                                        ['Total Slippage', `₹${result.slippage_detail.total_slippage.toFixed(4)}`],
                                    ].map(([lbl, val]) => (
                                        <div key={lbl} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 5, padding: '8px 10px' }}>
                                            <div style={LABEL}>{lbl}</div>
                                            <div style={{ fontSize: 14, ...MONO, color: 'var(--text-primary)', fontWeight: 700, marginTop: 2 }}>{val}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Exposure change (NEVER called Profit) */}
                            <div style={CARD}>
                                <div style={{ fontSize: 10, color: '#f5a623', ...MONO, letterSpacing: '0.15em', marginBottom: 12 }}>
                                    GREEK EXPOSURE CHANGE
                                    <span style={{ fontSize: 8, color: 'var(--text-muted)', marginLeft: 10 }}>Grey = before · Coloured = after</span>
                                </div>
                                <RiskMeter label="Delta |Δ|" before={eb.delta} after={ea.delta} cap={deltaCap} />
                                <RiskMeter label="Vega |ν|" before={eb.vega} after={ea.vega} cap={vegaCap} />
                                <RiskMeter label="Gamma |Γ|" before={eb.gamma} after={ea.gamma} cap={gammaCap} />
                                <div style={{ fontSize: 8, color: 'var(--text-muted)', ...MONO, marginTop: 4 }}>
                                    Theta: before {eb.theta.toFixed(4)} → after {ea.theta.toFixed(4)} (not cap-constrained)
                                </div>
                            </div>

                            {/* Violations */}
                            {result.violations.length > 0 && (
                                <div style={CARD}>
                                    <div style={{ fontSize: 10, color: '#ff4d6d', ...MONO, letterSpacing: '0.15em', marginBottom: 8 }}>
                                        ✗ RISK CONSTRAINT VIOLATIONS — ORDER REJECTED
                                    </div>
                                    {result.violations.map((v, i) => <ViolationCard key={i} v={v} />)}
                                </div>
                            )}

                            {/* Execution trace */}
                            <div style={CARD}>
                                <div style={{ fontSize: 10, color: 'var(--green)', ...MONO, letterSpacing: '0.15em', marginBottom: 12 }}>EXECUTION TRACE</div>
                                <TraceTimeline steps={result.execution_trace} />
                            </div>

                            {/* Disclaimer in results */}
                            <div style={{ padding: '8px 12px', background: 'rgba(255,77,109,0.04)', border: '1px solid rgba(255,77,109,0.15)', borderRadius: 5, fontSize: 8, color: 'rgba(255,77,109,0.8)', ...MONO, lineHeight: 1.7 }}>
                                {result.disclaimer}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
