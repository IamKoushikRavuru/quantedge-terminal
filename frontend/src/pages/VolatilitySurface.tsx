import { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { fetchVolSurface } from '../api/client';
import type { VolSurfaceResponse, VolSurfacePoint } from '../types';

type ViewMode = 'SYNTHETIC' | 'MARKET';

export default function VolatilitySurface() {
    const [view, setView] = useState<ViewMode>('SYNTHETIC');
    const [data, setData] = useState<VolSurfaceResponse | null>(null);

    useEffect(() => { fetchVolSurface('NIFTY', view).then(setData).catch(() => { }); }, [view]);

    const skew = data?.skew ?? { rr25d: -1.20, bf25d: 0.45, rr10d: -2.80, atmSkew: -0.32, termStructure: 'NORMAL' };

    // --- Plotly Data Transformation ---
    let surfacePoints = data?.points || [];

    // Fallback: Generate a synthetic surface if market data is empty/closed
    if (surfacePoints.length === 0) {
        const atm = 22400;
        const expiries = ['2026-03-01', '2026-03-08', '2026-03-29', '2026-04-26', '2026-06-28'];
        const syntheticPoints: VolSurfacePoint[] = [];

        expiries.forEach((exp, i) => {
            // Further back in time = flatter smile, lower overall IV
            const termStructureFactor = 1 - (i * 0.1);
            const baseIv = 0.14 - (i * 0.005);

            for (let strike = atm - 1000; strike <= atm + 1000; strike += 100) {
                const moneyness = (strike - atm) / atm;
                // Smile equation: Skewed higher on downside (puts)
                const smile = (Math.pow(moneyness, 2) * 2.5) - (moneyness * 0.4);

                syntheticPoints.push({
                    strike,
                    expiry: exp,
                    iv: baseIv + (smile * termStructureFactor),
                    delta: 0.5 // mock
                });
            }
        });
        surfacePoints = syntheticPoints;
    }

    const uniqueX = Array.from(new Set(surfacePoints.map(p => p.strike))).sort((a, b) => a - b);
    const uniqueY = Array.from(new Set(surfacePoints.map(p => p.expiry))).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Build Z matrix (Y rows, X columns) corresponding to (Expiry rows, Strike columns)
    const zMatrix = uniqueY.map(y => {
        return uniqueX.map(x => {
            const point = surfacePoints.find(p => p.strike === x && p.expiry === y);
            return point ? point.iv * 100 : null; // Plotly handles nulls gracefully, convert to %
        });
    });

    return (
        <div className="page active" style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn 0.3s ease' }}>
            {/* Header bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>VOLATILITY SURFACE</span>
                <div className="toggle-group">
                    {(['SYNTHETIC', 'MARKET'] as ViewMode[]).map(v => (
                        <button key={v} className={`toggle-btn${view === v ? ' active' : ''}`} onClick={() => setView(v)}>{v}</button>
                    ))}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <span className="badge badge-muted">NIFTY 50</span>
                    <span className="badge badge-green">LIVE SKEW</span>
                </div>
            </div>

            <div className="responsive-row" style={{ flex: 1, minHeight: 0, gap: 14 }}>
                {/* SURFACE CANVAS */}
                <div className="card" style={{ flex: 1, overflow: 'hidden' }}>
                    <div className="vol-surface-canvas">
                        <div className="vol-surface-grid" />
                        {zMatrix.length > 0 ? (
                            <Plot
                                data={[{
                                    z: zMatrix,
                                    x: uniqueX,
                                    y: uniqueY,
                                    type: 'surface',
                                    colorscale: [
                                        [0, 'rgb(30,30,80)'],
                                        [0.5, 'rgb(0,212,160)'],
                                        [1, 'rgb(255,77,109)']
                                    ],
                                    showscale: false,
                                    hovertemplate: 'Strike: %{x}<br>Expiry: %{y}<br>IV: %{z:.2f}%<extra></extra>'
                                }]}
                                layout={{
                                    autosize: true,
                                    margin: { l: 0, r: 0, b: 0, t: 0, pad: 0 },
                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                    scene: {
                                        xaxis: { title: { text: 'Strike' }, gridcolor: 'rgba(255,255,255,0.1)', tickfont: { size: 10 } },
                                        yaxis: { title: { text: 'Expiry' }, gridcolor: 'rgba(255,255,255,0.1)', tickfont: { size: 10 } },
                                        zaxis: { title: { text: 'Implied Vol. (%)' }, gridcolor: 'rgba(255,255,255,0.1)', tickfont: { size: 10 } },
                                        camera: { eye: { x: 1.6, y: -1.6, z: 1.2 } },
                                        bgcolor: 'rgba(0,0,0,0)'
                                    },
                                    font: { family: '"Space Mono", monospace', color: 'rgba(255,255,255,0.6)', size: 10 }
                                }}
                                useResizeHandler={true}
                                style={{ width: '100%', height: '100%', minHeight: 400 }}
                                config={{ displayModeBar: false, responsive: true }}
                            />
                        ) : (
                            <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading surface data...</div>
                        )}
                    </div>
                </div>

                {/* SIDE PANELS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 200 }}>
                    <div className="card">
                        <div className="card-header"><span className="card-title">Skew Summary</span></div>
                        <div className="card-body flex-col">
                            <div className="stat-row"><span className="stat-key">25Δ RR</span><span className="stat-val negative">{skew.rr25d.toFixed(2)}%</span></div>
                            <div className="stat-row"><span className="stat-key">25Δ BF</span><span className="stat-val">{skew.bf25d.toFixed(2)}%</span></div>
                            <div className="stat-row"><span className="stat-key">10Δ RR</span><span className="stat-val negative">{skew.rr10d.toFixed(2)}%</span></div>
                            <div className="stat-row"><span className="stat-key">TERM STR</span><span className="stat-val" style={{ color: 'var(--amber)' }}>{skew.termStructure}</span></div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header"><span className="card-title">Term Structure</span></div>
                        <div className="card-body">
                            <div className="chart-container" style={{ height: 100, border: '1px dashed var(--border)' }}><span>TERM CHART</span></div>
                        </div>
                    </div>
                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-header"><span className="card-title">Smile Cross-Section</span></div>
                        <div className="card-body">
                            <div className="chart-container" style={{ height: '100%', minHeight: 80, border: '1px dashed var(--border)' }}><span>SMILE CHART</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
