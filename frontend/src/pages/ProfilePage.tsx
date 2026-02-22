/**
 * ProfilePage — User profile, pricing history, and watchlist
 * Three tabs: Profile | History | Watchlist
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUser } from '../hooks/useAuth';

// ── API helpers ─────────────────────────────────────────────────────────────

const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

async function apiGet(path: string) {
    const r = await fetch(path, { headers: authHeader() });
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
}
async function apiPost(path: string, body: object) {
    const r = await fetch(path, { method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const e = await r.json(); throw new Error(e.detail ?? 'Error'); }
    return r.json();
}
async function apiDelete(path: string) {
    const r = await fetch(path, { method: 'DELETE', headers: authHeader() });
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Stats { history_count: number; watchlist_count: number; session_count: number; models_used: Record<string, number>; }
interface HistoryRecord { id: number; timestamp: string; model: string; symbol: string; option_type: string; strike: number; expiry: string; spot?: number; iv?: number; result_price?: number; }
interface WatchlistItem { id: number; symbol: string; strike: number; option_type: string; expiry: string; added_at: string; }
type Tab = 'profile' | 'history' | 'watchlist';

// ── Reusable style helpers ───────────────────────────────────────────────────

function tabStyle(active: boolean): React.CSSProperties {
    return {
        padding: '8px 18px', border: 'none', cursor: 'pointer', fontSize: 10,
        fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', textTransform: 'uppercase',
        background: active ? 'rgba(0,212,160,0.1)' : 'transparent',
        color: active ? 'var(--green)' : 'var(--text-muted)',
        borderBottom: active ? '2px solid var(--green)' : '2px solid transparent',
        transition: 'all 0.2s',
    };
}
function badgeStyle(color: string): React.CSSProperties {
    return { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontFamily: "'Space Mono',monospace", letterSpacing: '0.12em', textTransform: 'uppercase', background: `${color}18`, color, border: `1px solid ${color}40` };
}
function btnStyle(color = '#00d4a0'): React.CSSProperties {
    return { padding: '6px 14px', background: `${color}12`, border: `1px solid ${color}40`, borderRadius: 5, color, fontSize: 10, cursor: 'pointer', fontFamily: "'Space Mono',monospace", letterSpacing: '0.1em', transition: 'all 0.2s' };
}

const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 };
const titleStyle: React.CSSProperties = { fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 };
const theadStyle: React.CSSProperties = { fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: "'Space Mono',monospace", padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { fontSize: 11, fontFamily: "'Space Mono',monospace", padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-primary)', whiteSpace: 'nowrap' };
const inputStyle: React.CSSProperties = { padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: 'var(--text-primary)', fontSize: 11, fontFamily: "'Space Mono',monospace", outline: 'none' };
const modelColor = (m: string) => m === 'BLACK-SCHOLES' ? '#00d4a0' : m === 'BINOMIAL' ? '#4d9fff' : '#f5a623';

// ── Main Component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
    const navigate = useNavigate();
    const user = getUser();
    const [tab, setTab] = useState<Tab>('profile');
    const [stats, setStats] = useState<Stats | null>(null);
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [watchlist, setWatch] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Watchlist add form
    const [wSym, setWSym] = useState('NIFTY');
    const [wStr, setWStr] = useState('');
    const [wType, setWType] = useState('CE');
    const [wExp, setWExp] = useState('');
    const [wErr, setWErr] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [p, h, w] = await Promise.all([
                apiGet('/api/user/profile'),
                apiGet('/api/user/history?limit=200'),
                apiGet('/api/user/watchlist'),
            ]);
            setStats(p.stats);
            setHistory(h.records);
            setWatch(w.items);
        } catch { /* ignore */ }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    async function addWatch() {
        setWErr('');
        if (!wStr || isNaN(+wStr)) { setWErr('Enter a valid strike'); return; }
        try {
            await apiPost('/api/user/watchlist', { symbol: wSym, strike: +wStr, option_type: wType, expiry: wExp });
            setWStr(''); setWExp('');
            const w = await apiGet('/api/user/watchlist');
            setWatch(w.items);
        } catch (e: any) { setWErr(e.message); }
    }

    async function delWatch(id: number) {
        await apiDelete(`/api/user/watchlist/${id}`);
        setWatch(prev => prev.filter(x => x.id !== id));
    }

    async function delHistory(id?: number) {
        await apiDelete(id ? `/api/user/history?record_id=${id}` : '/api/user/history');
        if (id) setHistory(prev => prev.filter(x => x.id !== id));
        else setHistory([]);
    }

    const fmtTs = (ts: string) => ts ? ts.replace('T', ' ').slice(0, 16) + ' UTC' : '-';

    return (
        <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg-base)' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,212,160,0.1)', border: '1px solid rgba(0,212,160,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--green)', fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>
                    {(user?.name ?? user?.email ?? '?')[0].toUpperCase()}
                </div>
                <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Space Mono',monospace" }}>{user?.name || 'User'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{user?.email}</div>
                </div>
                <button onClick={() => navigate('/dashboard')} style={{ ...btnStyle(), marginLeft: 'auto' }}>← Dashboard</button>
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                {(['profile', 'history', 'watchlist'] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
                        {t === 'profile' ? '👤 Profile' : t === 'history' ? '📋 History' : '👁 Watchlist'}
                    </button>
                ))}
            </div>

            {loading && <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'Space Mono',monospace" }}>Loading…</div>}

            {/* ══ PROFILE TAB ══ */}
            {tab === 'profile' && !loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={cardStyle}>
                        <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', marginBottom: 14 }}>ACCOUNT DETAILS</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14 }}>
                            {([
                                ['EMAIL', user?.email ?? '-'],
                                ['NAME', user?.name || '—'],
                                ['MEMBER SINCE', user?.created_at?.slice(0, 10) ?? '-'],
                                ['ACTIVE SESSIONS', String(stats?.session_count ?? 0)],
                            ] as [string, string][]).map(([k, v]) => (
                                <div key={k} style={{ minWidth: 0 }}>
                                    <div style={titleStyle}>{k}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: "'Space Mono',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={cardStyle}>
                        <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', marginBottom: 14 }}>USAGE STATS</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
                            {([
                                ['Options Priced', String(stats?.history_count ?? 0), '#00d4a0'],
                                ['Watchlist Items', String(stats?.watchlist_count ?? 0), '#4d9fff'],
                                ['Sessions', String(stats?.session_count ?? 0), '#f5a623'],
                            ] as [string, string, string][]).map(([label, val, color]) => (
                                <div key={label} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 6, padding: '14px 16px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontFamily: "'Space Mono',monospace", color, fontWeight: 700 }}>{val}</div>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
                                </div>
                            ))}
                        </div>
                        {stats?.models_used && Object.keys(stats.models_used).length > 0 && (
                            <div>
                                <div style={titleStyle}>MODELS USED</div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                                    {Object.entries(stats.models_used).map(([model, cnt]) => (
                                        <span key={model} style={badgeStyle(modelColor(model))}>{model} · {cnt}×</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══ HISTORY TAB ══ */}
            {tab === 'history' && !loading && (
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em' }}>
                            PRICING HISTORY · {history.length} records
                        </div>
                        {history.length > 0 && (
                            <button onClick={() => delHistory()} style={btnStyle('#ff4d6d')}>✕ Clear All</button>
                        )}
                    </div>
                    {history.length === 0
                        ? <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'Space Mono',monospace", padding: 20, textAlign: 'center' }}>
                            No history yet — price an option from Model Comparison to log it here.
                        </div>
                        : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {['Time (UTC)', 'Model', 'Symbol', 'Type', 'Strike', 'Expiry', 'Spot', 'IV', 'Price', ''].map(h => (
                                                <th key={h} style={theadStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(r => (
                                            <tr key={r.id}>
                                                <td style={tdStyle}>{fmtTs(r.timestamp)}</td>
                                                <td style={tdStyle}><span style={badgeStyle(modelColor(r.model))}>{r.model}</span></td>
                                                <td style={tdStyle}>{r.symbol}</td>
                                                <td style={tdStyle}><span style={badgeStyle(r.option_type === 'CE' ? '#00d4a0' : '#ff4d6d')}>{r.option_type}</span></td>
                                                <td style={tdStyle}>{r.strike.toLocaleString('en-IN')}</td>
                                                <td style={tdStyle}>{r.expiry}</td>
                                                <td style={tdStyle}>{r.spot?.toFixed(2) ?? '—'}</td>
                                                <td style={tdStyle}>{r.iv ? (r.iv * 100).toFixed(2) + '%' : '—'}</td>
                                                <td style={{ ...tdStyle, color: 'var(--green)', fontWeight: 700 }}>{r.result_price?.toFixed(2) ?? '—'}</td>
                                                <td style={tdStyle}><button onClick={() => delHistory(r.id)} style={{ ...btnStyle('#ff4d6d'), padding: '2px 8px' }}>✕</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    }
                </div>
            )}

            {/* ══ WATCHLIST TAB ══ */}
            {tab === 'watchlist' && !loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Add form */}
                    <div style={cardStyle}>
                        <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', marginBottom: 14 }}>ADD TO WATCHLIST</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div>
                                <div style={titleStyle}>Symbol</div>
                                <select value={wSym} onChange={e => setWSym(e.target.value)} style={{ ...inputStyle, width: 120 }}>
                                    {['NIFTY', 'BANKNIFTY', 'FINNIFTY'].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <div style={titleStyle}>Strike</div>
                                <input type="number" value={wStr} onChange={e => setWStr(e.target.value)} placeholder="22400" style={{ ...inputStyle, width: 100 }} />
                            </div>
                            <div>
                                <div style={titleStyle}>Type</div>
                                <select value={wType} onChange={e => setWType(e.target.value)} style={{ ...inputStyle, width: 80 }}>
                                    <option>CE</option><option>PE</option>
                                </select>
                            </div>
                            <div>
                                <div style={titleStyle}>Expiry (optional)</div>
                                <input value={wExp} onChange={e => setWExp(e.target.value)} placeholder="27-Feb-2025" style={{ ...inputStyle, width: 130 }} />
                            </div>
                            <button onClick={addWatch} style={{ ...btnStyle(), padding: '7px 18px', fontSize: 11 }}>+ Add</button>
                        </div>
                        {wErr && <div style={{ color: '#ff4d6d', fontSize: 10, fontFamily: "'Space Mono',monospace", marginTop: 8 }}>⚠ {wErr}</div>}
                    </div>

                    {/* Items */}
                    <div style={cardStyle}>
                        <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em', marginBottom: 14 }}>
                            WATCHLIST · {watchlist.length} item{watchlist.length !== 1 ? 's' : ''}
                        </div>
                        {watchlist.length === 0
                            ? <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'Space Mono',monospace", padding: 20, textAlign: 'center' }}>No items yet — add a symbol above to monitor it.</div>
                            : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 10 }}>
                                    {watchlist.map(item => (
                                        <div key={item.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 7, padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div>
                                                    <span style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{item.symbol}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{item.strike.toLocaleString('en-IN')}</span>
                                                    <span style={{ ...badgeStyle(item.option_type === 'CE' ? '#00d4a0' : '#ff4d6d'), marginLeft: 8 }}>{item.option_type}</span>
                                                </div>
                                                <button onClick={() => delWatch(item.id)} style={{ ...btnStyle('#ff4d6d'), padding: '2px 8px', fontSize: 10 }}>✕</button>
                                            </div>
                                            {item.expiry && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.1em' }}>EXPIRY: {item.expiry}</div>}
                                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Added {item.added_at.slice(0, 10)}</div>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div>
                </div>
            )}
        </div>
    );
}
