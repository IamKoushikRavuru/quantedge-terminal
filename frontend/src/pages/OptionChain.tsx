import { useState, useEffect, useRef } from 'react';
import { fetchOptionChain } from '../api/client';
import type { OptionChainResponse, MarketSymbol } from '../types';

const SYMBOLS = ['NIFTY 50', 'BANKNIFTY', 'FINNIFTY'];
const EXPIRIES = ['27 FEB 2025', '06 MAR 2025', '27 MAR 2025'];

// Convert display label ('27 FEB 2025') → NSE path-safe format ('27-Feb-2025')
const MONTH_MAP: Record<string, string> = {
    JAN: 'Jan', FEB: 'Feb', MAR: 'Mar', APR: 'Apr', MAY: 'May', JUN: 'Jun',
    JUL: 'Jul', AUG: 'Aug', SEP: 'Sep', OCT: 'Oct', NOV: 'Nov', DEC: 'Dec',
};
function toApiExpiry(display: string): string {
    const [d, m, y] = display.split(' ');
    return `${d}-${MONTH_MAP[m] ?? m}-${y}`;
}
function toApiSymbol(display: string): MarketSymbol {
    return display.replace(' 50', '') as MarketSymbol;
}

function isMarketOpen(): boolean {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
    const day = ist.getUTCDay();
    if (day === 0 || day === 6) return false;
    const m = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    return m >= 555 && m <= 930; // 9:15–15:30 IST
}

function buildFallbackData(atmStrike: number, step = 100) {
    // Generate 12 strikes around the ATM automatically
    const strikes = Array.from({ length: 12 }, (_, i) => atmStrike - (step * 5) + (i * step));
    return strikes.map(k => {
        const moneyness = (k - atmStrike) / atmStrike;
        const callIV = +(14.8 + moneyness * -12 + Math.abs(moneyness) * 8).toFixed(2);
        const putIV = +(14.8 + moneyness * 10 + Math.abs(moneyness) * 6).toFixed(2);
        const callDelta = +Math.max(0.01, Math.min(0.99, (0.5 - moneyness * 4))).toFixed(3);
        const putDelta = +(-(1 - callDelta)).toFixed(3);
        const callOI = Math.round((800 - Math.abs(moneyness) * 4000) * 0.4 + 50);
        const putOI = Math.round((800 - Math.abs(moneyness) * 3200) * 0.4 + 50);
        const gamma = +(0.004 - Math.abs(moneyness) * 0.02).toFixed(4);
        const vega = +(0.35 - Math.abs(moneyness) * 1.2).toFixed(4);
        const theta = +(-0.08 - Math.abs(moneyness) * 0.1).toFixed(4);
        return { strike: k, callIV, putIV, callDelta, putDelta, callOI, putOI, gamma, vega, theta, isATM: k === atmStrike };
    });
}

export default function OptionChain() {
    const [sym, setSym] = useState('NIFTY 50');
    const [expiry, setExpiry] = useState(EXPIRIES[0]);
    const [data, setData] = useState<OptionChainResponse | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [greeksRow, setGreeksRow] = useState<{ delta: number; gamma: number; vega: number; theta: number; iv: number } | null>(null);
    const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setData(null);
        setErr(null);

        const load = () =>
            fetchOptionChain(toApiSymbol(sym), toApiExpiry(expiry))
                .then(setData)
                .catch(e => setErr(e.message));

        load();

        // 60s during market hours, 5 min otherwise
        const id = setInterval(load, isMarketOpen() ? 60_000 : 300_000);
        return () => clearInterval(id);
    }, [sym, expiry]);

    // Determine ATM from live data or fall back
    const liveATM = data?.meta?.atmStrike;
    let fallbackATM = 22400;
    if (sym === 'BANKNIFTY') fallbackATM = 47800;
    else if (sym === 'FINNIFTY') fallbackATM = 21100;
    const displayATM = liveATM ?? fallbackATM;

    const fallback = buildFallbackData(displayATM, sym === 'BANKNIFTY' ? 100 : 100);
    const allRows = data?.strikes?.length
        ? data.strikes.map(s => ({
            strike: s.strike,
            callIV: s.call.iv,
            putIV: s.put.iv,
            callDelta: s.call.delta,
            putDelta: s.put.delta,
            callOI: s.call.oi / 1000,
            putOI: s.put.oi / 1000,
            gamma: (s.call.greeks as any).gamma ?? 0.003,
            vega: (s.call.greeks as any).vega ?? 0.3,
            theta: (s.call.greeks as any).theta ?? -0.08,
            isATM: s.isATM,
        }))
        : fallback;
    const maxOI = Math.max(...allRows.map(r => Math.max(r.callOI, r.putOI)), 1);

    return (
        <div className="page active" style={{ flex: 1, padding: 0, gap: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeIn 0.3s ease' }}>
            {/* Error notice */}
            {err && (
                <div style={{ fontSize: 10, color: 'var(--amber)', fontFamily: "'Space Mono',monospace", padding: '4px 16px', background: 'rgba(245,166,35,0.05)', borderBottom: '1px solid rgba(245,166,35,0.15)', flexShrink: 0 }}>
                    ⚠ {err} — showing reference data
                </div>
            )}
            {/* Controls bar */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span className="card-title">OPTION CHAIN</span>
                <div className="toggle-group">
                    {SYMBOLS.map(s => (
                        <button key={s} className={`toggle-btn${sym === s ? ' active' : ''}`} onClick={() => setSym(s)}>{s}</button>
                    ))}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="badge badge-green">ATM: {displayATM.toLocaleString('en-IN')}</span>
                    {EXPIRIES.map(e => (
                        <button key={e} onClick={() => setExpiry(e)}
                            className={`badge ${expiry === e ? 'badge-blue' : 'badge-muted'}`} style={{ cursor: 'pointer', border: 'none', fontFamily: "'Space Mono',monospace" }}>{e}</button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="chain-table-wrapper" style={{ flex: 1 }}>
                <table className="chain-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>CALL OI</th>
                            <th>CALL IV</th>
                            <th>CALL Δ</th>
                            <th className="center" style={{ minWidth: 90 }}>STRIKE</th>
                            <th>PUT Δ</th>
                            <th>PUT IV</th>
                            <th style={{ textAlign: 'right' }}>PUT OI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allRows.map(row => {
                            const callOIWidth = Math.round((row.callOI / maxOI) * 80);
                            const putOIWidth = Math.round((row.putOI / maxOI) * 80);
                            return (
                                <tr key={row.strike} className={row.isATM ? 'atm' : ''}
                                    onMouseMove={e => {
                                        setGreeksRow({ delta: row.callDelta, gamma: row.gamma, vega: row.vega, theta: row.theta, iv: row.callIV });
                                        setPopupPos({ x: Math.min(e.clientX + 16, window.innerWidth - 240), y: Math.max(e.clientY - 80, 10) });
                                    }}
                                    onMouseLeave={() => setGreeksRow(null)}
                                    onClick={e => { e.currentTarget.parentElement && Array.from(e.currentTarget.parentElement.children).forEach(r => r.classList.remove('selected')); e.currentTarget.classList.add('selected'); }}
                                >
                                    <td style={{ textAlign: 'left' }}>
                                        <div className="oi-bar-container" style={{ justifyContent: 'flex-end' }}>
                                            <span style={{ color: 'var(--text-secondary)', marginRight: 6 }}>{row.callOI.toFixed(0)}K</span>
                                            <div className="oi-bar oi-call" style={{ width: callOIWidth }} />
                                        </div>
                                    </td>
                                    <td className="call-iv">{(+row.callIV).toFixed(2)}%</td>
                                    <td style={{ color: 'var(--green)' }}>{(+row.callDelta).toFixed(3)}</td>
                                    <td className="center strike-col">{row.strike.toLocaleString('en-IN')}</td>
                                    <td style={{ color: 'var(--red)' }}>{(+row.putDelta).toFixed(3)}</td>
                                    <td className="put-iv">{(+row.putIV).toFixed(2)}%</td>
                                    <td>
                                        <div className="oi-bar-container">
                                            <div className="oi-bar oi-put" style={{ width: putOIWidth }} />
                                            <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>{row.putOI.toFixed(0)}K</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Greeks popup */}
            {greeksRow && (
                <div ref={popupRef} className="greeks-popup" style={{ display: 'block', left: popupPos.x, top: popupPos.y }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>Greeks</div>
                    <div className="greek-row"><span className="greek-name">DELTA (Δ)</span><span className="greek-val">{greeksRow.delta.toFixed(3)}</span></div>
                    <div className="greek-row"><span className="greek-name">GAMMA (Γ)</span><span className="greek-val">{greeksRow.gamma.toFixed(4)}</span></div>
                    <div className="greek-row"><span className="greek-name">VEGA (V)</span><span className="greek-val">{greeksRow.vega.toFixed(4)}</span></div>
                    <div className="greek-row"><span className="greek-name">THETA (Θ)</span><span className="greek-val">{greeksRow.theta.toFixed(4)}</span></div>
                    <div className="greek-row"><span className="greek-name">IV (CALL)</span><span className="greek-val" style={{ color: 'var(--green)' }}>{(+greeksRow.iv).toFixed(2)}%</span></div>
                </div>
            )}
        </div>
    );
}
