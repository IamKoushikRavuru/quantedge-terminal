import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TICKER = ['NIFTY  19,425.35 +0.65%', 'BANKNIFTY  43,890.10 -0.10%', 'VIX  11.45 -2.4%', 'FINNIFTY  19,650.00 +0.08%', 'USD/INR  86.24 +0.02%', 'GOLD  72,341.50 +0.15%'];

const INIT_LINES = [
    { status: '✓', color: 'text-accent-green', text: 'NODE_CONNECTION: SECURE' },
    { status: '>>', color: 'text-primary animate-pulse', text: 'SYNCING DERIVATIVES LIQUIDITY...' },
    { status: '>>', color: 'text-primary animate-pulse', text: 'COMPILING GREEKS REAL-TIME...' },
    { status: '>>', color: 'text-primary animate-pulse', text: 'LOADING NSE OPTION CHAIN...' },
];

export default function TerminalPortal() {
    const nav = useNavigate();

    return (
        <div className="h-full w-full overflow-hidden bg-background-dark font-sans text-white relative select-none dark">

            {/* Scrolling ticker bar */}
            <div className="fixed top-0 left-0 w-full h-8 bg-black/80 backdrop-blur-md border-b border-white/10 z-50 overflow-hidden flex items-center">
                <div className="flex whitespace-nowrap animate-ticker font-mono text-[10px] tracking-widest text-text-secondary-dark">
                    {[...TICKER, ...TICKER].map((t, i) => (
                        <span key={i} className="px-8">
                            {t.split('  ')[0]}{'  '}
                            <span className={t.includes('-') ? 'text-accent-red' : 'text-accent-green'}>{t.split('  ')[1]}</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Background glow blobs */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="bg-candles absolute inset-0 opacity-30" />
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/20 blur-[80px] grid-pulse" />
                <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-purple-900/20 blur-[100px] grid-pulse" style={{ animationDelay: '2s' }} />
                <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] -z-10 rounded-full animate-pulse" />
                <div className="fixed -bottom-24 -left-24 w-[600px] h-[600px] bg-indigo-900/10 blur-[120px] -z-10 rounded-full" />
            </div>

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center justify-between min-h-screen pt-16 pb-12 px-6">

                {/* Header */}
                <header className="w-full max-w-7xl flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-primary/10 border border-primary/20">
                            <span className="material-symbols-outlined text-primary text-2xl">monitoring</span>
                        </div>
                        <h1 className="font-brand text-4xl tracking-[0.15em] shimmer-text">QUANTEDGE</h1>
                    </div>
                    <div className="flex items-center gap-8 font-mono text-[10px] text-text-secondary-dark">
                        <div className="hidden lg:flex flex-col items-end">
                            <span className="text-text-muted-dark mb-1">NETWORK LATENCY (MS)</span>
                            <svg className="w-32 h-8" viewBox="0 0 100 30">
                                <path d="M0 25 L10 20 L20 28 L30 15 L40 22 L50 10 L60 18 L70 5 L80 15 L90 8 L100 12"
                                    fill="none" stroke="#3B82F6" strokeWidth="1.5"
                                    strokeDasharray="100" strokeDashoffset="100"
                                    style={{ animation: 'fillProgress 2s ease forwards', strokeDashoffset: 0 }} />
                            </svg>
                        </div>
                        <div className="flex items-center gap-4 border-l border-white/10 pl-8">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
                                </span>
                                <span>SYSTEM: OPTIMAL</span>
                            </div>
                            <div className="hidden md:block">LD4-PRIME // 4.2ms</div>
                        </div>
                    </div>
                </header>

                {/* Hero */}
                <main className="flex-1 flex flex-col items-center justify-center w-full relative">
                    {/* Rotating 3D grid */}
                    <div className="volatility-grid absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="grid-surface" />
                        <div className="absolute flex gap-1 items-end opacity-20 translate-y-24">
                            {[64, 96, 48, 80, 128].map((h, i) => (
                                <div key={i} className={`w-2 ${i === 2 ? 'bg-accent-red' : 'bg-accent-green'}`} style={{ height: h }} />
                            ))}
                        </div>
                    </div>

                    <div className="relative z-20 text-center space-y-12">
                        <div className="space-y-4">
                            <h2 className="text-xs uppercase tracking-[0.6em] font-bold text-primary animate-pulse">Institutional Analytics Engine</h2>
                            <p className="text-5xl md:text-7xl font-display font-light tracking-tighter max-w-4xl mx-auto leading-none">
                                PROBABILITY <br /> <span className="font-bold italic text-white">RECONFIGURED.</span>
                            </p>
                        </div>

                        {/* Init console */}
                        <div className="bg-black/40 backdrop-blur-xl rounded-lg p-6 w-full max-w-md mx-auto text-left font-mono text-xs border border-white/10 shadow-2xl">
                            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">terminal</span>
                                    <span className="text-text-secondary-dark uppercase tracking-widest text-[10px]">Initialization Sequence</span>
                                </div>
                                <span className="text-primary">88%</span>
                            </div>
                            <div className="space-y-1.5 text-text-secondary-dark">
                                {INIT_LINES.map((l, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className={l.color}>{l.status}</span>
                                        <span>{l.text}</span>
                                    </div>
                                ))}
                                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: '88%' }} />
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="relative inline-block group">
                            <div className="absolute inset-0 bg-primary/30 rounded-lg -z-10 scale-100 group-hover:scale-150 group-hover:opacity-0 transition-all duration-500" />
                            <button
                                onClick={() => nav('/dashboard')}
                                className="relative px-12 py-5 bg-white text-black font-sans font-black tracking-[0.3em] rounded border-b-4 border-primary hover:bg-primary hover:text-white hover:-translate-y-1 active:translate-y-0 transition-all duration-200 text-sm"
                            >
                                ENTER TERMINAL
                            </button>
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-full text-center">
                                <span className="text-[9px] text-text-muted-dark uppercase tracking-[0.3em] font-mono">ENCRYPTED PORT: 8443</span>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer links */}
                <footer className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between text-[9px] text-text-muted-dark uppercase tracking-[0.2em] border-t border-white/5 pt-8 font-mono">
                    <div className="flex gap-10">
                        {[{ icon: 'shield', label: 'RISK PROTOCOL' }, { icon: 'api', label: 'API ACCESS' }, { icon: 'cloud_done', label: 'STATUS' }].map(l => (
                            <a key={l.label} href="#" className="hover:text-primary transition-colors flex items-center gap-2">
                                <span className="material-symbols-outlined text-xs">{l.icon}</span> {l.label}
                            </a>
                        ))}
                    </div>
                    <div className="flex items-center gap-6 mt-4 md:mt-0">
                        <span>© 2024 QUANTEDGE TECHNOLOGIES</span>
                        <div className="px-2 py-0.5 border border-accent-green/30 text-accent-green rounded bg-accent-green/5">HFT_READY</div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
