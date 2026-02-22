import { useState, useEffect } from 'react';
import { fetchModelComparison } from '../api/client';

export default function ModelComparison() {
    useEffect(() => { fetchModelComparison().catch(() => { }); }, []);

    const MetricTile = ({ val, label, color, bg, border }: { val: string; label: string; color: string; bg: string; border: string }) => (
        <div style={{ textAlign: 'center', flex: 1, background: bg, borderRadius: 6, padding: 8, border }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 20, color }}>{val}</div>
            <div className="metric-label">{label}</div>
        </div>
    );

    return (
        <div className="page active" style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>MODEL COMPARISON</span>
                <span className="badge badge-muted">ANALYTICAL REFERENCE</span>
            </div>

            <div className="grid-3" style={{ flex: 1, alignItems: 'start' }}>
                {/* BLACK-SCHOLES */}
                <div className="model-card model-bs">
                    <div className="model-icon">BS</div>
                    <div className="card-header" style={{ borderColor: 'rgba(0,212,160,0.1)' }}>
                        <div>
                            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: 'var(--green)', letterSpacing: '0.05em' }}>Black-Scholes</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", marginTop: 1 }}>CONTINUOUS-TIME · CLOSED FORM</div>
                        </div>
                        <span className="badge badge-green">ACTIVE</span>
                    </div>
                    <div className="card-body flex-col">
                        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                            <MetricTile val="O(1)" label="COMPLEXITY" color="var(--green)" bg="rgba(0,212,160,0.05)" border="1px solid rgba(0,212,160,0.1)" />
                            <MetricTile val="HIGH" label="SPEED" color="var(--green)" bg="rgba(0,212,160,0.05)" border="1px solid rgba(0,212,160,0.1)" />
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.08em', marginBottom: 6 }}>STRENGTHS</div>
                        <div className="strength-item"><span className="strength-dot">+</span>Closed-form solution for European options</div>
                        <div className="strength-item"><span className="strength-dot">+</span>Near-instant computation, scalable</div>
                        <div className="strength-item"><span className="strength-dot">+</span>Industry standard, well understood</div>
                        <div className="strength-item"><span className="strength-dot">+</span>Greeks analytically derived</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.08em', margin: '10px 0 6px' }}>LIMITATIONS</div>
                        <div className="weakness-item"><span className="weakness-dot">–</span>Constant volatility assumption</div>
                        <div className="weakness-item"><span className="weakness-dot">–</span>Log-normal returns (fat tails ignored)</div>
                        <div className="weakness-item"><span className="weakness-dot">–</span>No early exercise (European only)</div>
                        <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>BEST FOR</div>
                        <div style={{ fontSize: 11, color: 'var(--text-primary)', marginTop: 3 }}>Vanilla European options, IV extraction, rapid screening</div>
                    </div>
                </div>

                {/* BINOMIAL */}
                <div className="model-card model-bin">
                    <div className="model-icon">BT</div>
                    <div className="card-header" style={{ borderColor: 'rgba(77,159,255,0.1)' }}>
                        <div>
                            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: 'var(--blue)', letterSpacing: '0.05em' }}>Binomial Tree</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", marginTop: 1 }}>DISCRETE-TIME · LATTICE</div>
                        </div>
                        <span className="badge badge-blue">REFERENCE</span>
                    </div>
                    <div className="card-body flex-col">
                        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                            <MetricTile val="O(n²)" label="COMPLEXITY" color="var(--blue)" bg="var(--blue-dim)" border="1px solid rgba(77,159,255,0.15)" />
                            <MetricTile val="MED" label="SPEED" color="var(--blue)" bg="var(--blue-dim)" border="1px solid rgba(77,159,255,0.15)" />
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.08em', marginBottom: 6 }}>STRENGTHS</div>
                        <div className="strength-item"><span className="strength-dot">+</span>Handles American exercise style</div>
                        <div className="strength-item"><span className="strength-dot">+</span>Discrete-time, intuitive structure</div>
                        <div className="strength-item"><span className="strength-dot">+</span>Adapts to dividend modeling</div>
                        <div className="strength-item"><span className="strength-dot">+</span>Converges to BSM as steps → ∞</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.08em', margin: '10px 0 6px' }}>LIMITATIONS</div>
                        <div className="weakness-item"><span className="weakness-dot">–</span>Slower at high step counts</div>
                        <div className="weakness-item"><span className="weakness-dot">–</span>Still assumes constant vol per step</div>
                        <div className="weakness-item"><span className="weakness-dot">–</span>Numerically intensive for exotic payoffs</div>
                        <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>BEST FOR</div>
                        <div style={{ fontSize: 11, color: 'var(--text-primary)', marginTop: 3 }}>American options, dividend-paying stocks, barrier options</div>
                    </div>
                </div>

                {/* MONTE CARLO */}
                <div className="model-card model-mc">
                    <div className="model-icon">MC</div>
                    <div className="card-header" style={{ borderColor: 'rgba(245,166,35,0.1)' }}>
                        <div>
                            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: 'var(--amber)', letterSpacing: '0.05em' }}>Monte Carlo</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", marginTop: 1 }}>STOCHASTIC SIM · PATH-BASED</div>
                        </div>
                        <span className="badge badge-amber">COMPUTE HEAVY</span>
                    </div>
                    <div className="card-body flex-col">
                        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                            <MetricTile val="O(N)" label="COMPLEXITY" color="var(--amber)" bg="var(--amber-dim)" border="1px solid rgba(245,166,35,0.15)" />
                            <MetricTile val="LOW" label="SPEED" color="var(--amber)" bg="var(--amber-dim)" border="1px solid rgba(245,166,35,0.15)" />
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.08em', marginBottom: 6 }}>STRENGTHS</div>
                        <div className="strength-item"><span className="strength-dot">+</span>Handles any payoff structure</div>
                        <div className="strength-item"><span className="strength-dot">+</span>Supports stochastic volatility (Heston)</div>
                        <div className="strength-item"><span className="strength-dot">+</span>Path-dependent exotics supported</div>
                        <div className="strength-item"><span className="strength-dot">+</span>Highly flexible and extensible</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.08em', margin: '10px 0 6px' }}>LIMITATIONS</div>
                        <div className="weakness-item"><span className="weakness-dot">–</span>Slow convergence (1/√N rate)</div>
                        <div className="weakness-item"><span className="weakness-dot">–</span>Not suitable for real-time pricing</div>
                        <div className="weakness-item"><span className="weakness-dot">–</span>Variance in output without QMC</div>
                        <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>BEST FOR</div>
                        <div style={{ fontSize: 11, color: 'var(--text-primary)', marginTop: 3 }}>Exotic options, Asian/barrier payoffs, stochastic vol models</div>
                    </div>
                </div>
            </div>

            {/* Performance Matrix */}
            <div className="card">
                <div className="card-header"><span className="card-title">Performance Matrix</span></div>
                <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(3, 1fr)', gap: 0, fontFamily: "'Space Mono',monospace", fontSize: 10 }}>
                        <div />
                        <div style={{ textAlign: 'center', color: 'var(--green)', padding: 4 }}>BLACK-SCHOLES</div>
                        <div style={{ textAlign: 'center', color: 'var(--blue)', padding: 4 }}>BINOMIAL</div>
                        <div style={{ textAlign: 'center', color: 'var(--amber)', padding: 4 }}>MONTE CARLO</div>
                        {([
                            ['Computation', <><span className="badge badge-green">FAST</span></>, <><span className="badge badge-blue">MEDIUM</span></>, <><span className="badge badge-amber">SLOW</span></>],
                            ['American', <span style={{ color: 'var(--red)' }}>✕</span>, <span style={{ color: 'var(--green)' }}>✓</span>, <span style={{ color: 'var(--green)' }}>✓</span>],
                            ['Stoch. Vol', <span style={{ color: 'var(--red)' }}>✕</span>, <span style={{ color: 'var(--red)' }}>✕</span>, <span style={{ color: 'var(--green)' }}>✓</span>],
                            ['Exotic', <span style={{ color: 'var(--red)' }}>✕</span>, <span style={{ color: 'var(--amber)' }}>~</span>, <span style={{ color: 'var(--green)' }}>✓</span>],
                        ] as [string, React.ReactNode, React.ReactNode, React.ReactNode][]).map(([label, bs, bi, mc]) => (
                            [
                                <div key={label + 'k'} style={{ color: 'var(--text-muted)', padding: '5px 0', borderTop: '1px solid var(--border)' }}>{label}</div>,
                                <div key={label + 'bs'} style={{ textAlign: 'center', padding: 5, borderTop: '1px solid var(--border)' }}>{bs}</div>,
                                <div key={label + 'bi'} style={{ textAlign: 'center', padding: 5, borderTop: '1px solid var(--border)' }}>{bi}</div>,
                                <div key={label + 'mc'} style={{ textAlign: 'center', padding: 5, borderTop: '1px solid var(--border)' }}>{mc}</div>,
                            ]
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
