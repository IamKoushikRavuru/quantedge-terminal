/**
 * Phase 11 — Scenario Lab
 * Counterfactual re-pricing under spot/vol/time shocks.
 * NOT a forecast. NOT prediction. Counterfactual analysis only.
 */
import { useState } from 'react';

const DISCLAIMER = "Counterfactual analysis only. All outputs are theoretical re-pricings under hypothetical shocks — not forecasts, not predictions, and not investment advice.";
const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 };
const labelStyle: React.CSSProperties = { fontSize: 9, fontFamily: "'Space Mono',monospace", letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 };
const inputStyle: React.CSSProperties = { padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: 'var(--text-primary)', fontSize: 11, fontFamily: "'Space Mono',monospace", outline: 'none', width: '100%' };

function Slider({ label, value, min, max, step, unit, onChange }: {
    label: string; value: number; min: number; max: number; step: number; unit: string;
    onChange: (v: number) => void;
}) {
    const color = value > 0 ? '#00d4a0' : value < 0 ? '#ff4d6d' : 'var(--text-muted)';
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={labelStyle}>{label}</span>
                <span style={{ fontSize: 12, fontFamily: "'Space Mono',monospace", color, fontWeight: 700 }}>
                    {value > 0 ? '+' : ''}{value}{unit}
                </span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(+e.target.value)}
                style={{ width: '100%', accentColor: color, cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>{min}{unit}</span>
                <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>0</span>
                <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>+{max}{unit}</span>
            </div>
        </div>
    );
}

function CompareCard({ label, base, shocked, isGreek = false }: {
    label: string; base: number; shocked: number; isGreek?: boolean;
}) {
    const diff = shocked - base;
    const diffPct = base !== 0 ? (diff / Math.abs(base)) * 100 : 0;
    const color = diff > 0 ? '#00d4a0' : diff < 0 ? '#ff4d6d' : 'var(--text-muted)';
    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
            <div style={labelStyle}>{label}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 4, flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>BASE</div>
                    <div style={{ fontSize: 15, fontFamily: "'Space Mono',monospace", color: 'var(--text-primary)' }}>{base.toFixed(isGreek ? 4 : 2)}</div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>→</div>
                <div>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>SHOCKED</div>
                    <div style={{ fontSize: 15, fontFamily: "'Space Mono',monospace", color }}>{shocked.toFixed(isGreek ? 4 : 2)}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 9, fontFamily: "'Space Mono',monospace", color, fontWeight: 700 }}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(isGreek ? 4 : 2)}
                    </div>
                    {!isGreek && <div style={{ fontSize: 8, color, fontFamily: "'Space Mono',monospace" }}>({diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%)</div>}
                </div>
            </div>
        </div>
    );
}

export default function ScenarioLab() {
    const [symbol, setSymbol] = useState('NIFTY');
    const [strike, setStrike] = useState(22400);
    const [optType, setOptType] = useState<'call' | 'put'>('call');
    const [baseIV, setBaseIV] = useState(0.15);
    const [baseT, setBaseT] = useState(0.05);
    const [spotShock, setSpotShock] = useState(0);
    const [volShock, setVolShock] = useState(0);
    const [daysForw, setDaysForw] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const run = async () => {
        setLoading(true); setErr(null);
        try {
            const body = { symbol, strike: +strike, option_type: optType, base_iv: +baseIV, time_to_expiry: +baseT, spot_shock_pct: +spotShock, vol_shock_pct: +volShock, days_forward: +daysForw };
            const r = await fetch('/api/scenario/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!r.ok) { const e = await r.json(); throw new Error(e.detail ?? 'Error'); }
            setResult(await r.json());
        } catch (e: any) { setErr(e.message); }
        setLoading(false);
    };

    return (
        <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '8px 14px', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 6, fontSize: 10, color: '#f5a623', fontFamily: "'Space Mono',monospace" }}>
                ⚠ {DISCLAIMER}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>
                {/* Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={cardStyle}>
                        <div style={{ fontSize: 10, color: 'var(--green)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', marginBottom: 14 }}>BASE PARAMETERS</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                            <div>
                                <div style={labelStyle}>Symbol</div>
                                <select value={symbol} onChange={e => setSymbol(e.target.value)} style={inputStyle}>
                                    {['NIFTY', 'BANKNIFTY', 'FINNIFTY'].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <div style={labelStyle}>Option Type</div>
                                <select value={optType} onChange={e => setOptType(e.target.value as 'call' | 'put')} style={inputStyle}>
                                    <option value="call">CALL</option><option value="put">PUT</option>
                                </select>
                            </div>
                            <div>
                                <div style={labelStyle}>Strike</div>
                                <input type="number" value={strike} onChange={e => setStrike(+e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <div style={labelStyle}>Base IV (decimal)</div>
                                <input type="number" value={baseIV} step="0.01" min="0.01" max="2" onChange={e => setBaseIV(+e.target.value)} style={inputStyle} />
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <div style={labelStyle}>Time to Expiry (years)</div>
                                <input type="number" value={baseT} step="0.005" min="0.001" max="1" onChange={e => setBaseT(+e.target.value)} style={inputStyle} />
                                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", marginTop: 2 }}>~{Math.round(+baseT * 365)} calendar days</div>
                            </div>
                        </div>
                    </div>
                    <div style={cardStyle}>
                        <div style={{ fontSize: 10, color: 'var(--amber)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', marginBottom: 14 }}>HYPOTHETICAL SHOCKS</div>
                        <Slider label="Spot Shock" value={spotShock} min={-30} max={30} step={0.5} unit="%" onChange={setSpotShock} />
                        <Slider label="IV Shock" value={volShock} min={-50} max={50} step={1} unit="%" onChange={setVolShock} />
                        <Slider label="Days Forward (Theta decay)" value={daysForw} min={0} max={30} step={1} unit=" d" onChange={setDaysForw} />
                        <button onClick={run} disabled={loading} style={{ width: '100%', padding: '10px', background: 'rgba(0,212,160,0.1)', border: '1px solid rgba(0,212,160,0.4)', borderRadius: 5, color: 'var(--green)', fontSize: 11, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Space Mono',monospace", letterSpacing: '0.1em', marginTop: 4 }}>
                            {loading ? '⟳ COMPUTING…' : '▶ RUN SCENARIO'}
                        </button>
                        {err && <div style={{ color: '#ff4d6d', fontSize: 10, fontFamily: "'Space Mono',monospace", marginTop: 8 }}>⚠ {err}</div>}
                    </div>
                </div>

                {/* Results */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {!result && !loading && (
                        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'Space Mono',monospace", textAlign: 'center' }}>
                                Configure shocks and click RUN SCENARIO<br />
                                <span style={{ fontSize: 9, opacity: 0.6 }}>Theoretical re-pricing under counterfactual conditions</span>
                            </div>
                        </div>
                    )}

                    {result && (
                        <>
                            <div style={{ padding: '8px 12px', background: 'rgba(245,166,35,0.06)', borderRadius: 5, border: '1px solid rgba(245,166,35,0.15)', fontSize: 9, color: '#f5a623', fontFamily: "'Space Mono',monospace" }}>
                                COUNTERFACTUAL: {result.symbol} {result.strike} {result.option_type.toUpperCase()} · Spot {spotShock > 0 ? '+' : ''}{spotShock}% · IV {volShock > 0 ? '+' : ''}{volShock}% · {daysForw}d decay
                            </div>

                            <div style={cardStyle}>
                                <div style={{ fontSize: 10, color: 'var(--green)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', marginBottom: 12 }}>THEORETICAL PRICE</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                                    <CompareCard label="Option Price" base={result.base_price} shocked={result.shocked_price} />
                                    <CompareCard label="Spot" base={result.base_spot} shocked={result.shocked_spot} />
                                </div>
                            </div>

                            <div style={cardStyle}>
                                <div style={{ fontSize: 10, color: 'var(--green)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', marginBottom: 12 }}>GREEKS SHIFT</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                                    {(['delta', 'gamma', 'theta', 'vega', 'rho'] as const).map(g => (
                                        <CompareCard key={g} label={g.toUpperCase()} base={result.base_greeks[g]} shocked={result.shocked_greeks[g]} isGreek />
                                    ))}
                                </div>
                            </div>

                            <div style={cardStyle}>
                                <div style={{ fontSize: 10, color: 'var(--amber)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', marginBottom: 8 }}>PnL ATTRIBUTION (THEORETICAL)</div>
                                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", marginBottom: 10, letterSpacing: '0.08em' }}>First/second-order approximations. Not realized P&L. Research decomposition only.</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                                    {([['Δ-PnL (Delta)', result.delta_pnl, 'Δ × ΔSpot'], ['Γ-PnL (Gamma)', result.gamma_pnl, '½Γ × ΔSpot²'], ['ν-PnL (Vega)', result.vega_pnl, 'ν × Δσ'], ['Θ-PnL (Theta)', result.theta_pnl, 'Θ × days']] as [string, number, string][]).map(([label, val, formula]) => {
                                        const color = val > 0 ? '#00d4a0' : val < 0 ? '#ff4d6d' : 'var(--text-muted)';
                                        return (
                                            <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 5, padding: '10px 12px' }}>
                                                <div style={labelStyle}>{label}</div>
                                                <div style={{ fontSize: 18, fontFamily: "'Space Mono',monospace", color, fontWeight: 700, marginTop: 4 }}>{val > 0 ? '+' : ''}{val.toFixed(2)}</div>
                                                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", marginTop: 2 }}>{formula}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={cardStyle}>
                                <div style={{ fontSize: 10, color: 'var(--green)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', marginBottom: 12 }}>SURFACE DEFORMATION</div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                {['Strike', 'Base Price', 'Shocked Price', 'ΔPrice', 'Base Δ', 'Shocked Δ', 'Moneyness'].map(h => (
                                                    <th key={h} style={{ fontSize: 9, padding: '4px 8px', textAlign: 'left', fontFamily: "'Space Mono',monospace", color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(result.surface_rows || []).map((r: any) => {
                                                const color = r.price_change > 0 ? '#00d4a0' : r.price_change < 0 ? '#ff4d6d' : 'var(--text-muted)';
                                                const isTarget = r.strike === result.strike;
                                                const td: React.CSSProperties = { padding: '6px 8px', fontFamily: "'Space Mono',monospace", fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.03)' };
                                                return (
                                                    <tr key={r.strike} style={{ background: isTarget ? 'rgba(0,212,160,0.04)' : 'transparent' }}>
                                                        <td style={{ ...td, color: isTarget ? 'var(--green)' : 'var(--text-primary)' }}>{r.strike}{isTarget && ' ★'}</td>
                                                        <td style={td}>{r.base_price.toFixed(2)}</td>
                                                        <td style={{ ...td, color }}>{r.shocked_price.toFixed(2)}</td>
                                                        <td style={{ ...td, color, fontWeight: 700 }}>{r.price_change > 0 ? '+' : ''}{r.price_change.toFixed(2)}</td>
                                                        <td style={{ ...td, color: 'var(--text-muted)' }}>{r.base_delta.toFixed(4)}</td>
                                                        <td style={{ ...td, color: 'var(--text-muted)' }}>{r.shocked_delta.toFixed(4)}</td>
                                                        <td style={{ ...td, color: 'var(--text-muted)' }}>{(r.moneyness * 100).toFixed(2)}%</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
