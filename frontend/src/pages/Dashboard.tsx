import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMarketOverview } from '../api/client';
import type { MarketOverview } from '../types';
import { getUser } from '../hooks/useAuth';
import { pickQuoteForUser, pickQuoteForDay, QUOTES } from './Onboarding';

function Sparkline({ data, color }: { data: number[]; color: string }) {
    if (data.length < 2) {
        /* static fallback from reference HTML */
        return null;
    }
    const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
    const W = 140, H = 40;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / r) * (H - 4) - 2}`);
    const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p).join(' ');
    const id = 'sg' + color.replace('#', '');
    return (
        <div className="sparkline" style={{ width: 140 }}>
            <svg viewBox="0 0 140 40" preserveAspectRatio="none">
                <defs>
                    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
                <path d={d + ` L140,40 L0,40`} fill={`url(#${id})`} />
            </svg>
        </div>
    );
}

/** Returns true if current IST time is within NSE market hours (Mon-Fri 9:15-15:30) */
function isMarketOpen(): boolean {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
    const day = ist.getUTCDay(); // 0=Sun, 6=Sat
    if (day === 0 || day === 6) return false;
    const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    return minutes >= 555 && minutes <= 930; // 9:15 to 15:30
}

const MONO: React.CSSProperties = { fontFamily: "'Space Mono',monospace" };

// ── Welcome system ────────────────────────────────────────────────────────────

function WelcomeSystem() {
    const navigate = useNavigate();
    const user = getUser();
    const [modal, setModal] = useState(false);   // new-user welcome modal
    const [toast, setToast] = useState(false);   // returning-user toast
    const [toastVisible, setToastVisible] = useState(false);
    const dismissTimer = useRef<number>(0);

    useEffect(() => {
        // New user: show modal once after onboarding
        if (localStorage.getItem('qe_welcome_pending') === '1') {
            localStorage.removeItem('qe_welcome_pending');
            setModal(true);
            return;
        }
        // Returning user: show toast once per session
        if (sessionStorage.getItem('qe_session_greeted') === '0') {
            sessionStorage.setItem('qe_session_greeted', '1');
            setToast(true);
            setToastVisible(true);
            dismissTimer.current = window.setTimeout(() => setToastVisible(false), 6000);
        }
        return () => clearTimeout(dismissTimer.current);
    }, []);

    const userName = user?.name?.split(' ')[0] || 'there';
    const newQuote = pickQuoteForUser();
    const dayQuote = pickQuoteForDay();

    /* ── New User Modal ───────────────────────────────────── */
    if (modal) return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            animation: 'qe-fade-in 0.4s ease',
        }}>
            <div style={{
                width: 480, background: 'rgba(13,17,23,0.98)', border: '1px solid rgba(0,212,160,0.25)',
                borderRadius: 14, padding: '36px 40px', textAlign: 'center',
                boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(0,212,160,0.06)',
            }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: "'Inter',sans-serif", margin: '0 0 6px' }}>
                    Welcome to QuantEdge, <span style={{ color: '#00d4a0' }}>{userName}</span>
                </h2>
                <div style={{ fontSize: 10, ...MONO, color: '#00d4a0', letterSpacing: '0.15em', marginBottom: 20 }}>ANALYTICAL SYSTEM · READY</div>
                <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontStyle: 'italic', color: '#cbd5e0', fontFamily: "'Inter',sans-serif", lineHeight: 1.7, marginBottom: 8 }}>
                        "{newQuote.text}"
                    </div>
                    <div style={{ fontSize: 10, ...MONO, color: '#4a5568' }}>— {newQuote.author}</div>
                </div>
                <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 20, lineHeight: 1.6 }}>
                    We recommend spending 5 minutes in the QuantEdge Guide before exploring the platform.
                    It will save you from common misunderstandings.
                </div>
                <button onClick={() => { setModal(false); navigate('/guide'); }}
                    style={{ width: '100%', padding: '13px 0', background: 'rgba(0,212,160,0.12)', border: '1px solid rgba(0,212,160,0.4)', borderRadius: 8, color: '#fff', fontSize: 12, ...MONO, letterSpacing: '0.12em', cursor: 'pointer', marginBottom: 8 }}>
                    📘 START WITH THE GUIDE
                </button>
                <button onClick={() => setModal(false)}
                    style={{ width: '100%', padding: '11px 0', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#4a5568', fontSize: 11, ...MONO, cursor: 'pointer' }}>
                    GO TO DASHBOARD →
                </button>
            </div>
        </div>
    );

    /* ── Returning User Toast ─────────────────────────────── */
    if (toast) return (
        <div style={{
            position: 'fixed', bottom: 24, left: 24, zIndex: 7000, width: 320,
            background: 'rgba(13,17,23,0.97)', border: '1px solid rgba(0,212,160,0.2)',
            borderRadius: 10, padding: '14px 18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            transform: toastVisible ? 'translateX(0)' : 'translateX(-110%)',
            opacity: toastVisible ? 1 : 0,
            transition: 'transform 0.4s cubic-bezier(.4,0,.2,1), opacity 0.35s ease',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                <div>
                    <div style={{ fontSize: 9, ...MONO, color: '#00d4a0', letterSpacing: '0.15em', marginBottom: 3 }}>WELCOME BACK</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Inter',sans-serif" }}>{userName} ↗</div>
                </div>
                <button onClick={() => setToastVisible(false)}
                    style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 11, fontStyle: 'italic', color: '#8899aa', fontFamily: "'Inter',sans-serif", lineHeight: 1.6, marginBottom: 6 }}>
                "{dayQuote.text}"
            </div>
            <div style={{ fontSize: 9, ...MONO, color: '#2d3748' }}>— {dayQuote.author}</div>
        </div>
    );

    return null;
}


export default function Dashboard() {
    const [data, setData] = useState<MarketOverview | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);

    useEffect(() => {
        const load = () =>
            fetchMarketOverview()
                .then(d => { setData(d); setErr(null); setLastFetch(new Date()); })
                .catch(e => setErr(e.message));

        load(); // immediate first fetch

        // 30s during market hours, 5 min otherwise
        const interval = setInterval(() => {
            load();
        }, isMarketOpen() ? 30_000 : 300_000);

        return () => clearInterval(interval);
    }, []);

    const ctx = data?.context ?? { riskFreeRate: 0.065, settlementType: 'CASH SETTLED', activeModel: 'BLACK-SCHOLES', expiryCycle: 'WEEKLY', timeToExpiry: '4D 6H', nextExpiryDate: '27 FEB 2025' };
    const ivPct = data?.ivPercentile ?? [{ symbol: 'NIFTY' as const, ivPct: 32, iv30d: 14.82, ivHvRatio: 0.94 }, { symbol: 'BANKNIFTY' as const, ivPct: 48, iv30d: 16.44, ivHvRatio: 0.94 }];
    const oi = data?.oiDist ?? { totalCallOI: 12400000, totalPutOI: 15400000, pcrOI: 1.24, pcrVol: 0.89, pcrChange: 0.08, maxPain: 22300, gammaFlip: 22150 };
    const flows = data?.flows ?? { fiiNet: -284700, diiNet: 312400, fiiFnOOI: -12400, date: 'TODAY' };

    const indices = data?.indices ?? [
        { symbol: 'NIFTY' as const, ltp: 22419.65, change: 165.20, changePct: 0.74, atmIV: 14.82, pcr: 1.24, trend: 'UP' as const, sparklinePath: [] },
        { symbol: 'BANKNIFTY' as const, ltp: 47838.10, change: -149.80, changePct: -0.31, atmIV: 16.44, pcr: 0.87, trend: 'DOWN' as const, sparklinePath: [] },
    ];

    return (
        <>
            <WelcomeSystem />
            <div className="page active" style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Header row with live indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: -6 }}>
                    {lastFetch && (
                        <span style={{ fontSize: 9, fontFamily: "'Space Mono',monospace", color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                            {isMarketOpen()
                                ? <><span style={{ color: 'var(--green)', marginRight: 4, animation: 'qe-blink 1.5s step-end infinite' }}>●</span>LIVE · </>
                                : null
                            }
                            UPDATED {lastFetch.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} IST
                        </span>
                    )}
                </div>

                {err && <div style={{ fontSize: 10, color: 'var(--amber)', fontFamily: "'Space Mono',monospace", padding: '4px 8px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 4 }}>⚠ {err} — showing reference data</div>}

                {/* INDEX CARDS */}
                <div className="grid-2">
                    {indices.map(ix => {
                        const up = ix.change >= 0;
                        const [int_, dec] = ix.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 }).split('.');
                        return (
                            <div className="index-card" key={ix.symbol}>
                                <div className="card-header">
                                    <span className="card-title">{ix.symbol}</span>
                                    <div className="flex-row" style={{ gap: 6 }}>
                                        <span className={`badge ${up ? 'badge-green' : 'badge-red'}`}>{up ? '+' : ''}{ix.changePct.toFixed(2)}%</span>
                                        <span className="badge badge-blue">{up ? 'CE > PE' : 'PE > CE'}</span>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="flex-row" style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                                        <div>
                                            <div className="metric-value" style={{ fontSize: 36 }}>
                                                {int_}<span style={{ fontSize: 18, color: 'var(--text-secondary)' }}>.{dec}</span>
                                            </div>
                                            <div className="flex-row" style={{ gap: 8, marginTop: 4 }}>
                                                <span className={`metric-change ${up ? 'positive' : 'negative'}`}>{up ? '+' : ''}{ix.change.toFixed(2)}</span>
                                                <span className="metric-label">vs prev close</span>
                                            </div>
                                        </div>
                                        {ix.sparklinePath?.length > 0
                                            ? <Sparkline data={ix.sparklinePath} color={up ? 'var(--green)' : 'var(--red)'} />
                                            : (
                                                <div className="sparkline" style={{ width: 140 }}>
                                                    <svg viewBox="0 0 140 40" preserveAspectRatio="none">
                                                        <defs>
                                                            <linearGradient id={`sgf${ix.symbol}`} x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor={up ? 'rgba(0,212,160,0.3)' : 'rgba(255,77,109,0.25)'} /><stop offset="100%" stopColor="transparent" />
                                                            </linearGradient>
                                                        </defs>
                                                        {up
                                                            ? <><path d="M0 32 L10 30 L20 28 L30 31 L40 27 L50 24 L60 22 L70 25 L80 20 L90 16 L100 18 L110 14 L120 12 L130 10 L140 8" fill="none" stroke="var(--green)" strokeWidth="1.5" /><path d="M0 32 L10 30 L20 28 L30 31 L40 27 L50 24 L60 22 L70 25 L80 20 L90 16 L100 18 L110 14 L120 12 L130 10 L140 8 L140 40 L0 40" fill={`url(#sgf${ix.symbol})`} /></>
                                                            : <><path d="M0 10 L15 12 L25 9 L40 14 L55 18 L65 16 L75 22 L85 20 L100 25 L110 28 L120 26 L130 30 L140 32" fill="none" stroke="var(--red)" strokeWidth="1.5" /><path d="M0 10 L15 12 L25 9 L40 14 L55 18 L65 16 L75 22 L85 20 L100 25 L110 28 L120 26 L130 30 L140 32 L140 40 L0 40" fill={`url(#sgf${ix.symbol})`} /></>
                                                        }
                                                    </svg>
                                                </div>
                                            )
                                        }
                                    </div>
                                    <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
                                    <div className="grid-3" style={{ gap: 8 }}>
                                        <div><div className="stat-key">ATM IV</div><div className="stat-val positive" style={{ fontSize: 13 }}>{ix.atmIV.toFixed(2)}%</div></div>
                                        <div><div className="stat-key">PCR</div><div className="stat-val" style={{ fontSize: 13 }}>{ix.pcr.toFixed(2)}</div></div>
                                        <div><div className="stat-key">VIX</div><div style={{ fontSize: 13, fontFamily: "'Space Mono',monospace", color: 'var(--amber)' }}>14.8</div></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* SECOND ROW */}
                <div className="grid-3">
                    {/* Market Context */}
                    <div className="card">
                        <div className="card-header"><span className="card-title">Market Context</span></div>
                        <div className="card-body flex-col">
                            <div className="stat-row"><span className="stat-key">RISK-FREE RATE</span><span className="stat-val">{(ctx.riskFreeRate * 100).toFixed(2)}%</span></div>
                            <div className="stat-row"><span className="stat-key">SETTLEMENT</span><span className="stat-val" style={{ color: 'var(--blue)' }}>CASH SETTLED</span></div>
                            <div className="stat-row"><span className="stat-key">MODEL IN USE</span><span className="stat-val" style={{ color: 'var(--green)' }}>BLACK-SCHOLES</span></div>
                            <div className="stat-row"><span className="stat-key">EXPIRY CYCLE</span><span className="stat-val">{ctx.expiryCycle}</span></div>
                            <div className="stat-row"><span className="stat-key">T-TO-EXPIRY</span><span className="stat-val" style={{ color: 'var(--amber)' }}>{ctx.timeToExpiry}</span></div>
                        </div>
                    </div>

                    {/* IV Percentile */}
                    <div className="card">
                        <div className="card-header"><span className="card-title">IV Percentile</span><span className="badge badge-green">NORMAL</span></div>
                        <div className="card-body flex-col">
                            {ivPct.map((iv, i) => (
                                <div key={iv.symbol} style={{ marginTop: i > 0 ? 8 : 0 }}>
                                    <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span className="stat-key">{iv.symbol} IV%ile</span>
                                        <span className="stat-val positive">{iv.ivPct}%</span>
                                    </div>
                                    <div className="progress-track"><div className="progress-fill" style={{ width: `${iv.ivPct}%`, background: 'var(--green)' }} /></div>
                                </div>
                            ))}
                            <div style={{ marginTop: 8 }}>
                                <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span className="stat-key">IV/HV Ratio</span>
                                    <span className="stat-val" style={{ color: 'var(--amber)' }}>{ivPct[0]?.ivHvRatio.toFixed(2) ?? '0.94'}</span>
                                </div>
                                <div className="progress-track"><div className="progress-fill" style={{ width: '47%', background: 'var(--amber)' }} /></div>
                            </div>
                        </div>
                    </div>

                    {/* OI Distribution */}
                    <div className="card">
                        <div className="card-header"><span className="card-title">OI Distribution</span></div>
                        <div className="card-body flex-col">
                            <div className="stat-row"><span className="stat-key">TOTAL CE OI</span><span className="stat-val positive">{(oi.totalCallOI / 1e7).toFixed(2)} Cr</span></div>
                            <div className="stat-row"><span className="stat-key">TOTAL PE OI</span><span className="stat-val negative">{(oi.totalPutOI / 1e7).toFixed(2)} Cr</span></div>
                            <div className="stat-row"><span className="stat-key">MAX PAIN</span><span className="stat-val" style={{ color: 'var(--amber)' }}>{oi.maxPain.toLocaleString('en-IN')}</span></div>
                            <div className="stat-row"><span className="stat-key">PCR (OI)</span><span className="stat-val">{oi.pcrOI.toFixed(2)}</span></div>
                            <div className="stat-row"><span className="stat-key">CHANGE PCR</span><span className="stat-val positive">+{oi.pcrChange.toFixed(2)} ↑</span></div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM ROW */}
                <div className="grid-2" style={{ flex: 1, minHeight: 0 }}>
                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-header">
                            <span className="card-title">Intraday IV Skew</span>
                            <div className="flex-row"><span className="badge badge-muted">1D</span></div>
                        </div>
                        <div className="card-body" style={{ height: 'calc(100% - 40px)' }}>
                            <div className="chart-container" style={{ height: '100%', minHeight: 100, border: '1px dashed var(--border)' }}>
                                <span>IV SKEW CHART · WIRE API</span>
                            </div>
                        </div>
                    </div>
                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-header">
                            <span className="card-title">FII/DII Flows</span>
                            <span className="badge badge-muted">TODAY</span>
                        </div>
                        <div className="card-body flex-col">
                            <div className="stat-row"><span className="stat-key">FII NET</span><span className="stat-val negative">-₹{Math.abs(flows.fiiNet / 100).toFixed(0)} Cr</span></div>
                            <div className="stat-row"><span className="stat-key">DII NET</span><span className="stat-val positive">+₹{(flows.diiNet / 100).toFixed(0)} Cr</span></div>
                            <div className="stat-row"><span className="stat-key">FII F&O OI</span><span className="stat-val negative">{flows.fiiFnOOI.toLocaleString('en-IN')}</span></div>
                            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                            <div className="chart-container" style={{ height: 80, border: '1px dashed var(--border)' }}><span>FLOW CHART · WIRE API</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
