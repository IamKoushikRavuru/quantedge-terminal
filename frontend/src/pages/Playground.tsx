import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { postOptionPriceLegacy, type PricingRequest } from '../api/client';

interface SliderParam {
    label: string; name: keyof PricingRequest;
    min: number; max: number; step: number;
    format: (v: number) => string;
}

const sliders: SliderParam[] = [
    { label: 'Spot Price', name: 'S', min: 10, max: 200, step: 1, format: v => `₹${v.toFixed(0)}` },
    { label: 'Strike', name: 'K', min: 10, max: 200, step: 1, format: v => `₹${v.toFixed(0)}` },
    { label: 'Time to Expiry', name: 'T', min: 0.01, max: 2, step: 0.01, format: v => `${(v * 365).toFixed(0)}d` },
    { label: 'Risk-Free Rate', name: 'r', min: 0.01, max: 0.15, step: 0.001, format: v => `${(v * 100).toFixed(1)}%` },
    { label: 'Implied Vol (σ)', name: 'sigma', min: 0.01, max: 1.0, step: 0.01, format: v => `${(v * 100).toFixed(0)}%` },
];

function GreekBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = Math.min(Math.abs(value) / max * 100, 100);
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
                <span className="text-xxs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="mono-price text-xs font-semibold" style={{ color }}>{value.toFixed(4)}</span>
            </div>
            <div className="h-1 rounded-full w-full" style={{ background: 'var(--bg-elevated)' }}>
                <div
                    className="h-1 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}60` }}
                />
            </div>
        </div>
    );
}

export default function Playground() {
    const [params, setParams] = useState<PricingRequest>({
        S: 100, K: 100, T: 1.0, r: 0.05, sigma: 0.2, option_type: 'call'
    });
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Pick up params pre-filled from OptionChain click
    useEffect(() => {
        const stored = sessionStorage.getItem('playground_params');
        if (stored) {
            try { setParams(JSON.parse(stored)); } catch { }
            sessionStorage.removeItem('playground_params');
        }
    }, []);

    useEffect(() => {
        const id = setTimeout(async () => {
            setLoading(true);
            try {
                const r = await postOptionPriceLegacy(params);
                setResult(r);
            } catch { }
            setLoading(false);
        }, 250);
        return () => clearTimeout(id);
    }, [params]);

    const g = result?.greeks;
    const moneyness = params.K / params.S;

    return (
        <div className="h-full flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Option Playground
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Analytical Black-Scholes pricing — not a trading tool
                    </p>
                </div>
                {/* Type toggle */}
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                    {(['call', 'put'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setParams(p => ({ ...p, option_type: t }))}
                            className="px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all"
                            style={{
                                background: params.option_type === t ? (t === 'call' ? 'rgba(33,150,243,0.15)' : 'rgba(255,96,0,0.12)') : 'var(--bg-elevated)',
                                color: params.option_type === t ? (t === 'call' ? 'var(--neon-blue)' : '#ff8040') : 'var(--text-muted)',
                            }}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
                {/* Left: Parameters */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <Card>
                        <CardHeader><CardTitle>Parameters</CardTitle></CardHeader>
                        <CardContent className="space-y-5">
                            {sliders.map(s => (
                                <div key={s.name} className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                                        <span className="mono-price text-xs font-semibold" style={{ color: 'var(--neon-blue)' }}>
                                            {s.format(params[s.name] as number)}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        name={s.name}
                                        min={s.min} max={s.max} step={s.step}
                                        value={params[s.name] as number}
                                        onChange={e => setParams(p => ({ ...p, [s.name]: parseFloat(e.target.value) }))}
                                        className="w-full"
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Center: Price output */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <Card className="flex-1">
                        <CardHeader>
                            <CardTitle>Black-Scholes Price</CardTitle>
                            {loading && (
                                <div className="w-4 h-4 rounded-full border-2 animate-spin"
                                    style={{ borderColor: 'var(--neon-blue)', borderTopColor: 'transparent' }} />
                            )}
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center gap-6 flex-1 py-8">
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-xxs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                                    {params.option_type.toUpperCase()} OPTION PRICE
                                </span>
                                <div
                                    className="mono-price font-bold"
                                    style={{ fontSize: '3rem', lineHeight: 1, color: 'var(--text-primary)', animation: result ? 'tick 0.15s ease-out' : undefined }}
                                >
                                    {result ? `₹${result.price.toFixed(4)}` : '—'}
                                </div>
                            </div>

                            {/* Moneyness indicator */}
                            <div className="w-full max-w-xs">
                                <div className="flex justify-between text-xxs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                    <span>ITM ←</span>
                                    <span>ATM</span>
                                    <span>→ OTM</span>
                                </div>
                                <div className="h-1.5 rounded-full relative" style={{ background: 'var(--bg-elevated)' }}>
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-all duration-200"
                                        style={{
                                            left: `${Math.max(2, Math.min(98, (moneyness - 0.7) / 0.6 * 100))}%`,
                                            background: moneyness < 1 ? 'var(--neon-green)' : moneyness > 1 ? 'var(--neon-red)' : 'var(--neon-blue)',
                                            borderColor: 'var(--bg-panel)',
                                            transform: 'translate(-50%, -50%)',
                                            boxShadow: `0 0 8px ${moneyness < 1 ? 'var(--neon-green)' : moneyness > 1 ? 'var(--neon-red)' : 'var(--neon-blue)'}`,
                                        }}
                                    />
                                </div>
                                <div className="text-center mt-2 text-xxs font-semibold mono-price" style={{ color: 'var(--text-muted)' }}>
                                    K/S = {moneyness.toFixed(3)}
                                </div>
                            </div>

                            {/* Quick stats */}
                            <div className="grid grid-cols-2 gap-3 w-full">
                                {[
                                    { label: 'Intrinsic', val: result ? `₹${Math.max(0, params.option_type === 'call' ? params.S - params.K : params.K - params.S).toFixed(2)}` : '—' },
                                    { label: 'Time Value', val: result ? `₹${Math.max(0, result.price - Math.max(0, params.option_type === 'call' ? params.S - params.K : params.K - params.S)).toFixed(2)}` : '—' },
                                ].map(({ label, val }) => (
                                    <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: 'var(--bg-elevated)' }}>
                                        <div className="text-xxs" style={{ color: 'var(--text-muted)' }}>{label}</div>
                                        <div className="mono-price text-sm font-semibold mt-1" style={{ color: 'var(--text-secondary)' }}>{val}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Greeks */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <Card className="flex-1">
                        <CardHeader><CardTitle>Greeks</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {g ? (
                                <>
                                    <GreekBar label="Delta" value={g.delta} max={1} color="var(--neon-blue)" />
                                    <GreekBar label="Gamma" value={g.gamma} max={0.1} color="var(--neon-cyan)" />
                                    <GreekBar label="Theta" value={g.theta} max={0.05} color="var(--neon-red)" />
                                    <GreekBar label="Vega" value={g.vega} max={0.5} color="var(--neon-green)" />
                                    <GreekBar label="Rho" value={g.rho} max={0.5} color="var(--neon-amber)" />
                                </>
                            ) : (
                                <div className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                    Adjust parameters to compute Greeks
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
