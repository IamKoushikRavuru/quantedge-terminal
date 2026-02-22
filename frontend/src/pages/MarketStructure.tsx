/**
 * Phase 11 — Market Structure Analytics
 * OI Profile · Gamma Exposure · Flow Metrics · Vol Regime
 *
 * DISCLAIMER: Structural metrics only. Not directional forecasts.
 */
import { useState, useEffect } from 'react';

const DISCLAIMER = "Structural metrics derived from live market data. These are mechanical observations, not directional forecasts or investment recommendations.";

// ── Style helpers ─────────────────────────────────────────────────────────────
function badge(color: string, text: string) {
    return (
        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 3, fontSize: 9, fontFamily: "'Space Mono',monospace", letterSpacing: '0.1em', background: `${color}18`, color, border: `1px solid ${color}30` }}>
            {text.toUpperCase()}
        </span>
    );
}
const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 14 };
const titleStyle: React.CSSProperties = { fontSize: 10, fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', color: 'var(--green)', textTransform: 'uppercase', marginBottom: 12 };
const labelStyle: React.CSSProperties = { fontSize: 9, fontFamily: "'Space Mono',monospace", letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' };
const valStyle: React.CSSProperties = { fontSize: 13, fontFamily: "'Space Mono',monospace", color: 'var(--text-primary)' };

// ── OI Bar ────────────────────────────────────────────────────────────────────
function OIBar({ label, value, max, color, width = 200 }: { label: string; value: number; max: number; color: string; width?: number }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <div style={{ width: 52, fontSize: 9, fontFamily: "'Space Mono',monospace", color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{label}</div>
            <div style={{ width, height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s ease', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 9, fontFamily: "'Space Mono',monospace", color: 'var(--text-muted)', minWidth: 60 }}>
                {(value / 1000).toFixed(0)}K
            </div>
        </div>
    );
}

// ── GEX Bar ───────────────────────────────────────────────────────────────────
function GEXBar({ strike, netGex, maxAbs, isAtm }: { strike: number; netGex: number; maxAbs: number; isAtm: boolean }) {
    const pct = maxAbs > 0 ? Math.min(Math.abs(netGex) / maxAbs * 50, 50) : 0;
    const color = netGex >= 0 ? '#00d4a0' : '#ff4d6d';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <div style={{ width: 52, fontSize: 9, fontFamily: "'Space Mono',monospace", color: isAtm ? 'var(--amber)' : 'var(--text-muted)', textAlign: 'right' }}>{strike}</div>
            {/* Left (negative) bar */}
            <div style={{ width: 80, display: 'flex', justifyContent: 'flex-end' }}>
                {netGex < 0 && <div style={{ width: `${pct * 2}%`, height: 10, background: '#ff4d6d', borderRadius: '2px 0 0 2px', minWidth: 2 }} />}
            </div>
            {/* Center line */}
            <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
            {/* Right (positive) bar */}
            <div style={{ width: 80 }}>
                {netGex >= 0 && <div style={{ width: `${pct * 2}%`, height: 10, background: '#00d4a0', borderRadius: '0 2px 2px 0', minWidth: 2 }} />}
            </div>
            <div style={{ width: 50, fontSize: 8, color, fontFamily: "'Space Mono',monospace" }}>{netGex > 0 ? '+' : ''}{netGex.toFixed(0)}</div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MarketStructure() {
    const [sym, setSym] = useState('NIFTY');
    const [tab, setTab] = useState<'oi' | 'flow' | 'vol'>('oi');
    const [oiData, setOI] = useState<any>(null);
    const [flowData, setFlow] = useState<any>(null);
    const [volData, setVol] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const load = async (symbol: string) => {
        setLoading(true); setErr(null);
        try {
            const [oi, flow, vol] = await Promise.all([
                fetch(`/api/market/oi-profile?symbol=${symbol}`).then(r => r.json()),
                fetch(`/api/market/flow-metrics?symbol=${symbol}`).then(r => r.json()),
                fetch(`/api/market/vol-regime?symbol=${symbol}`).then(r => r.json()),
            ]);
            setOI(oi); setFlow(flow); setVol(vol);
        } catch (e: any) { setErr(e.message); }
        setLoading(false);
    };

    useEffect(() => { load(sym); }, [sym]);

    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '7px 16px', border: 'none', cursor: 'pointer', fontSize: 10,
        fontFamily: "'Space Mono',monospace", letterSpacing: '0.12em', textTransform: 'uppercase',
        background: active ? 'rgba(0,212,160,0.1)' : 'transparent',
        color: active ? 'var(--green)' : 'var(--text-muted)',
        borderBottom: active ? '2px solid var(--green)' : '2px solid transparent',
    });

    const maxOI = oiData ? Math.max(...(oiData.oi_rows || []).map((r: any) => Math.max(r.call_oi, r.put_oi))) : 1;
    const maxGEX = oiData ? Math.max(...(oiData.gex_rows || []).map((r: any) => Math.abs(r.net_gex)), 1) : 1;

    const regimeColor = (r: string) => ({ compressed: '#4d9fff', normal: '#00d4a0', elevated: '#f5a623', stressed: '#ff4d6d', unavailable: 'var(--text-muted)' }[r] || 'var(--text-muted)');

    return (
        <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Disclaimer */}
            <div style={{ padding: '8px 14px', background: 'rgba(77,159,255,0.06)', border: '1px solid rgba(77,159,255,0.18)', borderRadius: 6, marginBottom: 14, fontSize: 10, color: '#4d9fff', fontFamily: "'Space Mono',monospace", letterSpacing: '0.08em' }}>
                ℹ {DISCLAIMER}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
                <div style={labelStyle}>Symbol:</div>
                {['NIFTY', 'BANKNIFTY', 'FINNIFTY'].map(s => (
                    <button key={s} onClick={() => setSym(s)} style={{ padding: '5px 12px', border: `1px solid ${sym === s ? 'var(--green)' : 'var(--border)'}`, background: sym === s ? 'rgba(0,212,160,0.1)' : 'transparent', color: sym === s ? 'var(--green)' : 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontFamily: "'Space Mono',monospace" }}>{s}</button>
                ))}
                {oiData && <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>SPOT {oiData.spot?.toLocaleString('en-IN')} · EXPIRY {oiData.expiry}</span>}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
                <button style={tabStyle(tab === 'oi')} onClick={() => setTab('oi')}>OI / GEX</button>
                <button style={tabStyle(tab === 'flow')} onClick={() => setTab('flow')}>Flow Metrics</button>
                <button style={tabStyle(tab === 'vol')} onClick={() => setTab('vol')}>Vol Regime</button>
            </div>

            {loading && <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'Space Mono',monospace" }}>Loading structural data…</div>}
            {err && <div style={{ color: '#f5a623', fontSize: 10, fontFamily: "'Space Mono',monospace" }}>⚠ {err} — market may be closed or NSE API unavailable</div>}

            {/* ── OI / GEX ── */}
            {tab === 'oi' && oiData && !loading && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Summary cards */}
                    <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                        {[
                            ['MAX PAIN', oiData.max_pain?.toLocaleString('en-IN'), '#f5a623'],
                            ['MAX PAIN vs SPOT', `${oiData.max_pain_vs_spot_pct > 0 ? '+' : ''}${oiData.max_pain_vs_spot_pct}%`, oiData.max_pain_vs_spot_pct > 2 ? '#f5a623' : 'var(--text-primary)'],
                            ['GAMMA FLIP', oiData.gamma_flip ? oiData.gamma_flip.toLocaleString('en-IN') : '—', '#4d9fff'],
                            ['PCR (OI)', oiData.pcr_oi?.toFixed(2) ?? '—', oiData.pcr_oi > 1.2 ? '#00d4a0' : oiData.pcr_oi < 0.8 ? '#ff4d6d' : 'var(--text-primary)'],
                        ].map(([label, val, color]) => (
                            <div key={label as string} style={{ ...cardStyle, marginBottom: 0, padding: 12 }}>
                                <div style={labelStyle}>{label}</div>
                                <div style={{ ...valStyle, color: color as string, fontSize: 18, marginTop: 4 }}>{val as string}</div>
                            </div>
                        ))}
                    </div>

                    {/* OI bars */}
                    <div style={cardStyle}>
                        <div style={titleStyle}>Strike-wise Open Interest</div>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                            <span style={{ fontSize: 9, color: '#00d4a0', fontFamily: "'Space Mono',monospace" }}>■ CALL OI</span>
                            <span style={{ fontSize: 9, color: '#ff4d6d', fontFamily: "'Space Mono',monospace" }}>■ PUT OI</span>
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: 400 }}>
                            {(oiData.oi_rows || []).map((r: any) => (
                                <div key={r.strike}>
                                    {r.is_atm && <div style={{ fontSize: 8, color: 'var(--amber)', fontFamily: "'Space Mono',monospace", marginBottom: 2, letterSpacing: '0.1em' }}>▶ ATM</div>}
                                    <OIBar label={`${r.strike}`} value={r.call_oi} max={maxOI} color="#00d4a0" />
                                    <OIBar label="" value={r.put_oi} max={maxOI} color="#ff4d6d" />
                                    <div style={{ height: 4 }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* GEX bars */}
                    <div style={cardStyle}>
                        <div style={titleStyle}>Gamma Exposure (GEX)</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", marginBottom: 10, letterSpacing: '0.08em' }}>
                            Positive = dealers long gamma (stabilising). Negative = dealers short gamma (amplifying).
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', fontSize: 8, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", marginBottom: 6 }}>
                            <span style={{ marginRight: 60, color: '#ff4d6d' }}>◀ SHORT GAMMA</span>
                            <span style={{ color: '#00d4a0' }}>LONG GAMMA ▶</span>
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: 400 }}>
                            {(oiData.gex_rows || []).map((r: any) => {
                                const oiRow = (oiData.oi_rows || []).find((o: any) => o.strike === r.strike);
                                return <GEXBar key={r.strike} strike={r.strike} netGex={r.net_gex} maxAbs={maxGEX} isAtm={oiRow?.is_atm ?? false} />;
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── FLOW METRICS ── */}
            {tab === 'flow' && flowData && !loading && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={cardStyle}>
                        <div style={titleStyle}>Put / Call Ratios</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                ['PCR (OI)', flowData.pcr_oi?.toFixed(3) ?? '—'],
                                ['PCR (Volume)', flowData.pcr_volume?.toFixed(3) ?? '—'],
                                ['Total Call OI', (flowData.total_call_oi / 1000).toFixed(0) + 'K'],
                                ['Total Put OI', (flowData.total_put_oi / 1000).toFixed(0) + 'K'],
                                ['Total Call Vol', (flowData.total_call_volume / 1000).toFixed(0) + 'K'],
                                ['Total Put Vol', (flowData.total_put_volume / 1000).toFixed(0) + 'K'],
                            ].map(([label, val]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                                    <span style={labelStyle}>{label}</span>
                                    <span style={valStyle}>{val}</span>
                                </div>
                            ))}
                            <div>
                                <div style={labelStyle}>PCR REGIME</div>
                                <div style={{ marginTop: 4 }}>{badge(
                                    flowData.pcr_regime === 'balanced' ? '#00d4a0' : flowData.pcr_regime === 'elevated_put_demand' ? '#f5a623' : '#4d9fff',
                                    flowData.pcr_regime?.replace(/_/g, ' ') ?? '-'
                                )}</div>
                            </div>
                        </div>
                    </div>
                    <div style={cardStyle}>
                        <div style={titleStyle}>Volume Concentration — Top Strikes</div>
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ ...labelStyle, marginBottom: 6, color: '#00d4a0' }}>TOP CALL STRIKES BY VOLUME</div>
                            {(flowData.top_call_strikes_by_vol || []).map((s: any) => (
                                <div key={s.strike} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11 }}>{s.strike}</span>
                                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--text-muted)' }}>{(s.volume / 1000).toFixed(0)}K</span>
                                </div>
                            ))}
                        </div>
                        <div>
                            <div style={{ ...labelStyle, marginBottom: 6, color: '#ff4d6d' }}>TOP PUT STRIKES BY VOLUME</div>
                            {(flowData.top_put_strikes_by_vol || []).map((s: any) => (
                                <div key={s.strike} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11 }}>{s.strike}</span>
                                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--text-muted)' }}>{(s.volume / 1000).toFixed(0)}K</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 14, padding: '8px 10px', background: 'rgba(245,166,35,0.06)', borderRadius: 5, border: '1px solid rgba(245,166,35,0.15)' }}>
                            <div style={{ fontSize: 9, color: '#f5a623', fontFamily: "'Space Mono',monospace", letterSpacing: '0.1em' }}>DEALER POSITIONING PROXY</div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: "'Space Mono',monospace", marginTop: 4 }}>{flowData.dealer_proxy_label}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── VOL REGIME ── */}
            {tab === 'vol' && volData && !loading && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={cardStyle}>
                        <div style={titleStyle}>Volatility Metrics</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ padding: '12px 14px', border: `1px solid ${regimeColor(volData.vol_regime)}40`, borderRadius: 6, background: `${regimeColor(volData.vol_regime)}08` }}>
                                <div style={labelStyle}>VOL REGIME</div>
                                <div style={{ fontSize: 20, fontFamily: "'Space Mono',monospace", color: regimeColor(volData.vol_regime), textTransform: 'uppercase', marginTop: 4 }}>{volData.vol_regime}</div>
                            </div>
                            {[
                                ['ATM IV', `${volData.atm_iv_pct?.toFixed(2)}%`],
                                ['HV Proxy (est.)', `${volData.hv_proxy_pct?.toFixed(2)}%`],
                                ['IV / HV Ratio', volData.iv_hv_ratio?.toFixed(3) ?? '—'],
                                ['Skew (Put–Call IV)', `${((volData.skew ?? 0) * 100).toFixed(2)}pp`],
                                ['Skew Label', volData.skew_label?.replace(/_/g, ' ')],
                                ['Term Structure', volData.term_structure_shape?.toUpperCase()],
                            ].map(([label, val]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                                    <span style={labelStyle}>{label}</span>
                                    <span style={valStyle}>{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={cardStyle}>
                        <div style={titleStyle}>Term Structure</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", marginBottom: 12, letterSpacing: '0.08em' }}>
                            ATM IV by expiry. Contango = normal (near &lt; far). Backwardation = stress signal.
                        </div>
                        {(volData.term_structure || []).map((ts: any, i: number) => {
                            const maxIv = Math.max(...(volData.term_structure || []).map((t: any) => t.atm_iv));
                            const pct = maxIv > 0 ? (ts.atm_iv / maxIv) * 100 : 0;
                            const color = i === 0 ? '#f5a623' : '#4d9fff';
                            return (
                                <div key={ts.expiry} style={{ marginBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ ...labelStyle, color: color }}>{ts.expiry}</span>
                                        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color }}>{(ts.atm_iv * 100).toFixed(2)}%</span>
                                    </div>
                                    <div style={{ height: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
                                    </div>
                                </div>
                            );
                        })}
                        {!volData.term_structure?.length && <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'Space Mono',monospace" }}>Term structure data unavailable</div>}
                    </div>
                </div>
            )}
        </div>
    );
}
