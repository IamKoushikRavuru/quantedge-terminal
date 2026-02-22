export default function RightPanel() {
    const S = { padding: '12px', borderBottom: '1px solid var(--border)' };
    const label = (t: string) => (
        <div style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 8 }}>{t}</div>
    );
    const row = (name: string, val: string, color?: string) => (
        <div className="watch-row" key={name}>
            <span className="watch-name" style={{ color: name === 'NIFTY' || name === 'BANKNIFTY' || name === 'FINNIFTY' ? 'var(--text-primary)' : undefined }}>{name}</span>
            <span className="watch-val" style={{ color: color ?? undefined }}>{val}</span>
        </div>
    );

    return (
        <div style={{ width: 220, borderLeft: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
            <div className="panel-section" style={S}>
                {label('Watchlist')}
                {[
                    { n: 'NIFTY', v: '22,419', cls: 'positive' },
                    { n: 'BANKNIFTY', v: '47,838', cls: 'negative' },
                    { n: 'FINNIFTY', v: '21,104', cls: 'positive' },
                    { n: 'MIDCPNIFTY', v: '11,834', cls: 'positive' },
                    { n: 'SENSEX', v: '74,021', cls: 'negative' },
                ].map(x => (
                    <div className="watch-row" key={x.n}>
                        <span className="watch-name" style={{ color: 'var(--text-primary)' }}>{x.n}</span>
                        <span className={`watch-val ${x.cls}`}>{x.v}</span>
                    </div>
                ))}
            </div>
            <div className="panel-section" style={S}>
                {label('Volatility')}
                {row('INDIA VIX', '14.80', 'var(--amber)')}
                <div className="watch-row"><span className="watch-name">VIX CHG</span><span className="watch-val negative">-0.42%</span></div>
                <div className="watch-row"><span className="watch-name">ATM IV</span><span className="watch-val positive">14.82%</span></div>
                <div className="watch-row"><span className="watch-name">HV (30D)</span><span className="watch-val">15.74%</span></div>
            </div>
            <div className="panel-section" style={S}>
                {label('Option Snapshot')}
                {row('MAX PAIN', '22,300', 'var(--amber)')}
                {row('PCR (OI)', '1.24')}
                {row('PCR (VOL)', '0.89')}
                {row('GAMMA FLIP', '22,150', 'var(--blue)')}
            </div>
            <div className="panel-section" style={S}>
                {label('Global')}
                <div className="watch-row"><span className="watch-name">VIX (US)</span><span className="watch-val positive">13.42</span></div>
                <div className="watch-row"><span className="watch-name">SPX</span><span className="watch-val positive">5,848</span></div>
                <div className="watch-row"><span className="watch-name">USDINR</span><span className="watch-val">83.42</span></div>
                <div className="watch-row"><span className="watch-name">10Y YIELD</span><span className="watch-val" style={{ color: 'var(--amber)' }}>7.18%</span></div>
            </div>
            <div style={{ padding: '12px', borderBottom: 'none' }}>
                {label('Session')}
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: 4 }}>NSE CASH <span className="badge badge-green" style={{ fontSize: 8 }}>OPEN</span></div>
                    <div style={{ marginBottom: 4 }}>NSE F&O <span className="badge badge-green" style={{ fontSize: 8 }}>OPEN</span></div>
                    <div>CLOSE IN <span style={{ color: 'var(--amber)' }}>2H 34M</span></div>
                </div>
            </div>
        </div>
    );
}
