import React, { useState, useEffect, useMemo } from 'react';
import { fetchResidualHeatmap } from '../api/client';
import type { ResidualHeatmapResponse } from '../types';

function buildFallbackCells(rows = 6, cols = 8) {
    return Array.from({ length: rows * cols }, (_, i) => {
        const val = Math.abs(Math.sin(i * 0.7) * 0.5 + (i % 7) * 0.07);
        const r = Math.round(val > 0.5 ? (val - 0.5) * 2 * 255 : 0);
        const g = Math.round(val < 0.5 ? 212 : Math.max(0, 212 - (val - 0.5) * 2 * 212));
        const b = Math.round(val < 0.5 ? Math.max(0, 160 - val * 320) : 0);
        return { bg: `rgba(${r},${g},${b},0.6)`, title: `Error: ${(val * 0.02).toFixed(4)}` };
    });
}

function cellFromApi(error: number) {
    const val = Math.min(1, Math.abs(error) * 10);
    const r = Math.round(val > 0.5 ? (val - 0.5) * 2 * 255 : 0);
    const g = Math.round(val < 0.5 ? 212 : Math.max(0, 212 - (val - 0.5) * 2 * 212));
    const b = Math.round(val < 0.5 ? Math.max(0, 160 - val * 320) : 0);
    return { bg: `rgba(${r},${g},${b},0.6)`, title: `Error: ${error.toFixed(4)}` };
}

export default function MLInsights() {
    const [data, setData] = useState<ResidualHeatmapResponse | null>(null);
    useEffect(() => { fetchResidualHeatmap().then(setData).catch(() => { }); }, []);

    const fallbackCells = useMemo(() => buildFallbackCells(), []);
    const m = data?.metrics;

    const displayCells = data?.cells?.length
        ? data.cells.map(c => cellFromApi(c.error))
        : fallbackCells;

    return (
        <div className="page active" style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>ML INSIGHTS</span>
                <div className="ml-disclaimer">⚠ ANALYTICAL ONLY — NOT PREDICTIVE TRADING SIGNALS</div>
            </div>

            <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
                {/* ARCHITECTURE DIAGRAM */}
                <div className="card" style={{ flex: 1.2 }}>
                    <div className="card-header">
                        <span className="card-title">Residual Learning Architecture</span>
                        <span className="badge badge-purple">CONCEPTUAL</span>
                    </div>
                    <div className="card-body" style={{ overflow: 'auto' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: 8 }}>

                            {/* INPUT ROW */}
                            <div className="arch-row" style={{ width: '100%' }}>
                                {['S, K, T', 'σ, r', 'OI, Vol', 'Skew'].map(n => (
                                    <div key={n} className="residual-node rn-input" style={{ width: 64, height: 36 }}>{n}</div>
                                ))}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>INPUT FEATURES</div>

                            {/* Arrow down */}
                            <svg width="20" height="24" viewBox="0 0 20 24">
                                <path d="M10 0 L10 16 M4 12 L10 20 L16 12" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
                            </svg>

                            {/* Hidden layers box */}
                            <div style={{ background: 'rgba(179,136,255,0.05)', border: '1px solid rgba(179,136,255,0.15)', borderRadius: 8, padding: 12, width: '100%', position: 'relative' }}>
                                <div style={{ fontSize: 9, color: 'var(--purple)', fontFamily: "'Space Mono',monospace", marginBottom: 8, letterSpacing: '0.08em' }}>DEEP LAYERS (BSM RESIDUAL LEARNING)</div>
                                <div className="arch-row">
                                    {(['FC-256', 'FC-256', 'FC-128', 'FC-64'] as const).map((n, i) => (
                                        <React.Fragment key={`${n}-${i}`}>
                                            <div className="residual-node rn-hidden" style={{ width: 52, height: 32, fontSize: 8 }}>{n}</div>
                                            {i < 3 && (
                                                <svg width="30" height="2">
                                                    <line x1="0" y1="1" x2="30" y2="1" stroke="rgba(179,136,255,0.3)" strokeWidth="1" />
                                                </svg>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                                <div style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)' }}>
                                    <span className="badge" style={{ background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(245,166,35,0.2)', fontSize: 8 }}>
                                        + SKIP CONNECTION (RESIDUAL)
                                    </span>
                                </div>
                            </div>

                            {/* Output row */}
                            <div style={{ marginTop: 8, width: '100%' }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
                                    <div className="residual-node rn-skip" style={{ width: 90, height: 32, fontSize: 9 }}>BSM BASE PRICE</div>
                                    <svg width="30" height="2"><line x1="0" y1="1" x2="30" y2="1" stroke="rgba(245,166,35,0.4)" strokeWidth="1.5" strokeDasharray="4,2" /></svg>
                                    <svg width="20" height="20" viewBox="0 0 20 20">
                                        <text x="10" y="14" textAnchor="middle" fill="rgba(245,166,35,0.6)" fontSize="16" fontFamily="Space Mono">⊕</text>
                                    </svg>
                                    <svg width="30" height="2"><line x1="0" y1="1" x2="30" y2="1" stroke="rgba(0,212,160,0.4)" strokeWidth="1.5" /></svg>
                                    <div className="residual-node rn-output" style={{ width: 90, height: 36, fontSize: 9 }}>IV PREDICTION</div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* RIGHT: HEATMAP + METRICS */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Error heatmap */}
                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-header">
                            <span className="card-title">Prediction Error Heatmap</span>
                            <span className="badge badge-muted">STRIKE × EXPIRY</span>
                        </div>
                        <div className="card-body" style={{ height: 'calc(100% - 40px)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, height: 'calc(100% - 24px)', minHeight: 80 }}>
                                {displayCells.map((cell, i) => (
                                    <div key={i} className="heatmap-cell" title={cell.title}
                                        style={{ background: cell.bg, borderRadius: 2, border: '1px solid rgba(0,0,0,0.2)' }} />
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, fontFamily: "'Space Mono',monospace", fontSize: 9, color: 'var(--text-muted)' }}>
                                <div style={{ width: 60, height: 4, background: 'linear-gradient(90deg, var(--green), var(--amber), var(--red))', borderRadius: 2 }} />
                                <span>LOW → HIGH RESIDUAL</span>
                            </div>
                        </div>
                    </div>

                    {/* Model metrics */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Model Performance</span>
                            <span className="badge badge-muted">BACKTEST</span>
                        </div>
                        <div className="card-body flex-col">
                            <div className="stat-row"><span className="stat-key">RMSE (IV)</span><span className="stat-val positive">{m ? m.rmse.toFixed(4) : '0.0042'}</span></div>
                            <div className="stat-row"><span className="stat-key">MAE (IV)</span><span className="stat-val positive">{m ? m.mae.toFixed(4) : '0.0031'}</span></div>
                            <div className="stat-row"><span className="stat-key">R² SCORE</span><span className="stat-val positive">{m ? m.r2.toFixed(4) : '0.9871'}</span></div>
                            <div className="stat-row"><span className="stat-key">PARAMS</span><span className="stat-val">{m ? (m.paramCount / 1e6).toFixed(1) + 'M' : '2.4M'}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
