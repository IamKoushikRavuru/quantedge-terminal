import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type Tab = 'login' | 'register';

interface FieldState { email: string; password: string; name: string; }

export default function LoginPage() {
    const navigate = useNavigate();
    const { saveAuth } = useAuth();
    const [tab, setTab] = useState<Tab>('login');
    const [fields, setFields] = useState<FieldState>({ email: '', password: '', name: '' });
    const [error, setError] = useState('');
    const [loading, setLoad] = useState(false);

    const set = (k: keyof FieldState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setFields(f => ({ ...f, [k]: e.target.value }));

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoad(true);
        try {
            const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
            const body: Record<string, string> = { email: fields.email, password: fields.password };
            if (tab === 'register') body.name = fields.name;

            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://quantedge-terminal.onrender.com';
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.detail ?? 'Request failed');
            saveAuth(data.token, data.user);
            if (tab === 'register') {
                localStorage.setItem('qe_is_new_user', '1');
                navigate('/onboarding', { replace: true });
            } else {
                // Mark session as fresh so dashboard can show returning greeting once
                sessionStorage.setItem('qe_session_greeted', '0');
                navigate('/dashboard', { replace: true });
            }
        } catch (err: any) {
            setError(err.message ?? 'Something went wrong');
        } finally {
            setLoad(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#080b0f', fontFamily: "'Space Mono', monospace", position: 'relative', overflow: 'hidden',
        }}>
            {/* Background grid */}
            <div style={{
                position: 'fixed', inset: 0, opacity: 0.03, pointerEvents: 'none',
                backgroundImage: 'linear-gradient(rgba(0,212,160,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,160,0.2) 1px, transparent 1px)',
                backgroundSize: '50px 50px',
            }} />
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(circle at center, rgba(0,212,160,0.04) 0%, transparent 70%)',
            }} />

            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 420, padding: '0 24px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, color: '#fff', margin: 0, letterSpacing: '0.02em' }}>
                        QUANT<span style={{ color: '#00d4a0' }}>EDGE</span>
                    </h1>
                    <p style={{ color: '#3d4f62', fontSize: 9, letterSpacing: '0.35em', textTransform: 'uppercase', marginTop: 4 }}>
                        Institutional Analytics Terminal
                    </p>
                </div>

                {/* Card */}
                <div style={{
                    background: 'rgba(13,17,23,0.95)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, overflow: 'hidden',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,160,0.05)',
                }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {(['login', 'register'] as Tab[]).map(t => (
                            <button key={t} onClick={() => { setTab(t); setError(''); }}
                                style={{
                                    flex: 1, padding: '14px 0', fontSize: 10, fontFamily: "'Space Mono',monospace",
                                    letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                                    background: tab === t ? 'rgba(0,212,160,0.06)' : 'transparent',
                                    color: tab === t ? '#00d4a0' : '#3d4f62',
                                    borderBottom: tab === t ? '2px solid #00d4a0' : '2px solid transparent',
                                    transition: 'all 0.2s',
                                }}>
                                {t === 'login' ? '→ Sign In' : '+ Register'}
                            </button>
                        ))}
                    </div>

                    {/* Form */}
                    <form onSubmit={submit} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {tab === 'register' && (
                            <div>
                                <label style={labelStyle}>NAME <span style={{ color: '#3d4f62' }}>(optional)</span></label>
                                <input value={fields.name} onChange={set('name')} placeholder="Your name"
                                    style={inputStyle} />
                            </div>
                        )}

                        <div>
                            <label style={labelStyle}>EMAIL ADDRESS</label>
                            <input type="email" required value={fields.email} onChange={set('email')}
                                placeholder="you@example.com" style={inputStyle} />
                        </div>

                        <div>
                            <label style={labelStyle}>PASSWORD {tab === 'register' && <span style={{ color: '#3d4f62' }}>(min 6 chars)</span>}</label>
                            <input type="password" required value={fields.password} onChange={set('password')}
                                placeholder="••••••••" style={inputStyle} />
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.2)',
                                borderRadius: 6, padding: '10px 14px', fontSize: 10, color: '#ff4d6d',
                                letterSpacing: '0.05em',
                            }}>
                                ⚠ {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                            style={{
                                marginTop: 8, padding: '14px 0', background: loading ? 'rgba(0,212,160,0.08)' : 'rgba(0,212,160,0.12)',
                                border: '1px solid rgba(0,212,160,0.35)', borderRadius: 7, color: '#fff',
                                fontSize: 12, fontFamily: "'Space Mono',monospace", letterSpacing: '0.15em',
                                textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 0 20px rgba(0,212,160,0.1)',
                                transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}
                            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,212,160,0.22)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = loading ? 'rgba(0,212,160,0.08)' : 'rgba(0,212,160,0.12)'; }}
                        >
                            {loading
                                ? <><Spinner /> {tab === 'login' ? 'AUTHENTICATING…' : 'REGISTERING…'}</>
                                : (tab === 'login' ? '→ INITIALIZE SESSION' : '+ CREATE ACCOUNT')
                            }
                        </button>
                    </form>
                </div>

                {/* Back to home */}
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button onClick={() => navigate('/')}
                        style={{
                            background: 'none', border: 'none', color: '#3d4f62', fontSize: 9,
                            letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
                            fontFamily: "'Space Mono',monospace"
                        }}>
                        ← BACK TO LAUNCHPAD
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 8, color: '#1a2535', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    ANALYTICAL ONLY · NOT INVESTMENT ADVICE
                </div>
            </div>
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 9, letterSpacing: '0.2em',
    color: '#3d4f62', marginBottom: 6, textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6, color: '#e8edf2', fontSize: 12, fontFamily: "'Space Mono',monospace",
    outline: 'none',
};

function Spinner() {
    return (
        <div style={{
            width: 12, height: 12, border: '1.5px solid rgba(255,255,255,0.15)',
            borderTopColor: '#00d4a0', borderRadius: '50%', animation: 'qe-spin 0.7s linear infinite',
            flexShrink: 0,
        }} />
    );
}
