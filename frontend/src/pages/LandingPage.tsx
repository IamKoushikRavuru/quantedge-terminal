import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../hooks/useAuth';

/* ─── IST Timestamp ───────────────────────────────────────────────── */
function useISTTimestamp() {
    const [ts, setTs] = useState('');
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
            const pad = (n: number) => String(n).padStart(2, '0');
            setTs(
                `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())} ` +
                `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())} IST`
            );
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);
    return ts;
}

/* ─── Backend status probe ────────────────────────────────────────── */
type Phase = 'checking' | 'ready' | 'failed';
function useBackendStatus() {
    const [health, setHealth] = useState<Phase>('checking');
    const [nse, setNse] = useState<Phase>('checking');

    useEffect(() => {
        // 1. Basic health
        fetch('/api/market/overview', { signal: AbortSignal.timeout(4000) })
            .then(r => r.json())
            .then(body => {
                if (body.status === 'ok') { setHealth('ready'); setNse('ready'); }
                else { setHealth('ready'); setNse('failed'); }
            })
            .catch(() => { setHealth('failed'); setNse('failed'); });
    }, []);

    return { health, nse };
}


/* ─── Main component ─────────────────────────────────────────────── */
export default function LandingPage() {
    const navigate = useNavigate();
    const ts = useISTTimestamp();
    const { health, nse } = useBackendStatus();
    const [hovered, setHov] = useState(false);

    const healthLabel = health === 'checking' ? 'SYSTEM_INITIALIZING' : health === 'ready' ? 'SYSTEM_READY' : 'SYSTEM_ERROR';
    const nseLabel = nse === 'checking' ? 'ESTABLISHING_NSE_FEED' : nse === 'ready' ? 'NSE_FEED_CONNECTED' : 'NSE_FEED_UNAVAILABLE';
    const healthRight = health === 'checking' ? '…' : health === 'ready' ? '0.001ms' : 'ERROR';
    const nseRight = nse === 'checking' ? '…' : nse === 'ready' ? 'CONNECTED' : 'FALLBACK';

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#080b0f', overflow: 'hidden', position: 'relative',
            fontFamily: "'Space Mono', monospace",
        }}>

            {/* ── Background layers ── */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(circle at center, rgba(0,212,160,0.03) 0%, transparent 70%)',
            }} />
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.05,
                backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 40px, #fff 40px 41px)',
                maskImage: 'linear-gradient(to bottom, transparent, black, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black, transparent)',
            }} />
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.03,
                backgroundImage:
                    'linear-gradient(rgba(0,212,160,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,160,0.2) 1px, transparent 1px)',
                backgroundSize: '50px 50px',
            }} />

            {/* ── Main content ── */}
            <div style={{
                position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center', maxWidth: 800, padding: '0 24px', width: '100%'
            }}>

                {/* ── Rotating vol surface ── */}
                <div style={{
                    height: 'clamp(80px, 15vh, 160px)', width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', marginBottom: 'clamp(16px, 3vh, 24px)', perspective: 1000
                }}>
                    <div style={{
                        width: 340, height: 170, transformStyle: 'preserve-3d',
                        animation: 'qe-rotate-surface 20s linear infinite',
                    }}>
                        <svg width="100%" height="100%" viewBox="0 0 400 200"
                            style={{ stroke: 'none', fill: 'none' }}>
                            <path d="M0 100 Q100 20 200 100 T400 100" stroke="#00d4a0" strokeWidth="1.5" opacity="0.6" />
                            <path d="M0 120 Q100 40 200 120 T400 120" stroke="#4d9fff" strokeWidth="1" opacity="0.4" />
                            <path d="M0 140 Q100 60 200 140 T400 140" stroke="#00d4a0" strokeWidth="1" opacity="0.3" />
                            <line x1="50" y1="0" x2="50" y2="200" stroke="#4d9fff" strokeWidth="0.5" opacity="0.2" />
                            <line x1="150" y1="0" x2="150" y2="200" stroke="#4d9fff" strokeWidth="0.5" opacity="0.2" />
                            <line x1="250" y1="0" x2="250" y2="200" stroke="#4d9fff" strokeWidth="0.5" opacity="0.2" />
                            <line x1="350" y1="0" x2="350" y2="200" stroke="#4d9fff" strokeWidth="0.5" opacity="0.2" />
                        </svg>
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <div style={{
                                width: 128, height: 128, borderRadius: '50%',
                                background: '#00d4a0', opacity: 0.05, filter: 'blur(40px)'
                            }} />
                        </div>
                    </div>
                </div>

                {/* ── Brand ── */}
                <div style={{ marginBottom: 'clamp(20px, 4vh, 32px)' }}>
                    <h1 style={{
                        fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(52px, 10vw, 96px)',
                        letterSpacing: '-0.02em', color: '#fff', margin: 0, lineHeight: 1,
                    }}>
                        QUANT<span style={{ color: '#00d4a0' }}>EDGE</span>
                    </h1>
                    <p style={{
                        color: '#3d4f62', fontSize: 10, letterSpacing: '0.4em',
                        textTransform: 'uppercase', marginTop: 8, fontWeight: 700,
                    }}>
                        Institutional Analytics Engine v4.0
                    </p>
                </div>

                {/* ── System status panel ── */}
                <div style={{
                    width: '100%', maxWidth: 420, background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6,
                    padding: '16px 20px', marginBottom: 'clamp(24px, 5vh, 32px)', backdropFilter: 'blur(12px)',
                    display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                    {/* re-render with colours */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                            <span style={{ color: health === 'ready' ? '#00d4a0' : health === 'checking' ? '#4d9fff' : '#ff4d6d' }}>●</span>
                            <span style={{ color: health === 'ready' ? '#00d4a0' : 'rgba(255,255,255,0.6)' }}>{healthLabel}</span>
                            <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.18)' }}>{healthRight}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                            <span style={{ color: '#4d9fff' }}>●</span>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>CALIBRATING_GREEK_ENGINE</span>
                            <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.18)' }}>SUCCESS</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                            <span style={{ color: nse === 'ready' ? '#4d9fff' : nse === 'checking' ? '#4d9fff' : '#ff4d6d' }}>●</span>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{nseLabel}</span>
                            <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.18)' }}>{nseRight}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                            <span style={{ color: 'rgba(255,255,255,0.3)', animation: 'qe-blink 1s step-end infinite' }}>_</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>INITIALIZING_TERMINAL_UI</span>
                            <span style={{ marginLeft: 'auto', color: '#00d4a0', animation: 'qe-blink 1s step-end infinite' }}>|</span>
                        </div>
                    </div>
                </div>

                {/* ── Launch button ── */}
                <div style={{ position: 'relative' }}>
                    {/* glow halo */}
                    <div style={{
                        position: 'absolute', inset: -4,
                        background: '#00d4a0', opacity: hovered ? 0.35 : 0.15,
                        borderRadius: 10, filter: 'blur(20px)',
                        transition: 'opacity 0.4s ease',
                    }} />
                    <button
                        onClick={() => navigate(getToken() ? '/dashboard' : '/login')}
                        onMouseEnter={() => setHov(true)}
                        onMouseLeave={() => setHov(false)}
                        style={{
                            position: 'relative',
                            background: 'rgba(0,212,160,0.1)',
                            backdropFilter: 'blur(12px)',
                            border: `1px solid ${hovered ? '#00d4a0' : 'rgba(0,212,160,0.3)'}`,
                            boxShadow: hovered
                                ? '0 0 40px rgba(0,212,160,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                                : '0 0 20px rgba(0,212,160,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                            padding: '20px 48px',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 18,
                            fontWeight: 700,
                            fontFamily: "'Space Mono', monospace",
                            letterSpacing: hovered ? '0.1em' : '0.06em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 16,
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ color: '#00d4a0', fontSize: 22 }}>terminal</span>
                        INITIALIZE TERMINAL
                    </button>

                    {/* sub-badges */}
                    <div style={{
                        display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20,
                        fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em',
                        textTransform: 'uppercase'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>encrypted</span>
                            256-BIT ENCRYPTION
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>speed</span>
                            LOW_LATENCY_CANVAS
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Corner candlestick decorations ── */}
            <div style={{ position: 'fixed', bottom: 40, left: 40, opacity: 0.08 }}>
                <svg stroke="white" fill="none" height="200" viewBox="0 0 100 200" width="100">
                    <rect height="80" width="20" x="40" y="50" />
                    <line x1="50" x2="50" y1="30" y2="50" />
                    <line x1="50" x2="50" y1="130" y2="150" />
                    <rect height="40" width="20" x="70" y="20" />
                    <line x1="80" x2="80" y1="10" y2="20" />
                    <line x1="80" x2="80" y1="60" y2="80" />
                </svg>
            </div>
            <div style={{ position: 'fixed', top: 40, right: 40, opacity: 0.08, transform: 'rotate(180deg)' }}>
                <svg stroke="white" fill="none" height="200" viewBox="0 0 100 200" width="100">
                    <rect height="40" width="20" x="40" y="80" />
                    <line x1="50" x2="50" y1="60" y2="80" />
                    <line x1="50" x2="50" y1="120" y2="140" />
                    <rect height="100" width="20" x="10" y="40" />
                    <line x1="20" x2="20" y1="20" y2="40" />
                    <line x1="20" x2="20" y1="140" y2="170" />
                </svg>
            </div>

            {/* ── Footer status bar ── */}
            <div style={{
                position: 'fixed', bottom: 16, left: 0, right: 0,
                padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.2em',
                textTransform: 'uppercase', fontFamily: "'Space Mono', monospace",
            }}>
                <div>SESSIONID: QE_992_X_ALPHA</div>
                <div style={{ display: 'flex', gap: 24 }}>
                    <span style={{ color: 'rgba(0,212,160,0.45)' }}>PROD_ENV_ACTIVE</span>
                    <span>LATENCY: 0.12MS</span>
                    <span>{ts}</span>
                </div>
            </div>

            {/* ── Keyframe animations (injected via style tag) ── */}
            <style>{`
        @keyframes qe-rotate-surface {
          from { transform: rotateY(0deg) rotateX(20deg); }
          to   { transform: rotateY(360deg) rotateX(20deg); }
        }
        @keyframes qe-blink {
          50% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: inherit;
          display: inline-block;
          line-height: 1;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
        }
      `}</style>
        </div>
    );
}
