/**
 * Phase 15 — Onboarding Page
 * ----------------------------
 * Shown only to brand-new users after registration.
 * 4-step wizard: Profile → Background → Purpose → Confirmation
 * Saves to backend, then navigates to /dashboard.
 * localStorage flag 'qe_is_new_user' is cleared on completion.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUser } from '../hooks/useAuth';

const MONO: React.CSSProperties = { fontFamily: "'Space Mono',monospace" };
const GREEN = '#00d4a0';

// ── Financial quotes (shuffled for returning users) ─────────────────────────────
export const QUOTES = [
    { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
    { text: "Bulls make money, bears make money, pigs get slaughtered.", author: "Wall Street Proverb" },
    { text: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
    { text: "Know what you own, and know why you own it.", author: "Peter Lynch" },
    { text: "The most important quality for an investor is temperament, not intellect.", author: "Warren Buffett" },
    { text: "In investing, what is comfortable is rarely profitable.", author: "Robert Arnott" },
    { text: "Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1.", author: "Warren Buffett" },
    { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
    { text: "The intelligent investor is a realist who sells to optimists and buys from pessimists.", author: "Benjamin Graham" },
    { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
    { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { text: "The individual investor should act consistently as an investor and not as a speculator.", author: "Benjamin Graham" },
    { text: "Compound interest is the eighth wonder of the world. He who understands it, earns it.", author: "Albert Einstein" },
    { text: "The core principle of investment is to go contrary to the general market opinion.", author: "Lord Rothschild" },
    { text: "Markets can remain irrational longer than you can remain solvent.", author: "John Maynard Keynes" },
];

// For new users, ALWAYS return this specific quote
export function pickQuoteForUser() {
    return { text: "Do not save what is left after SPENDING, but Spend what is left after SAVING", author: "Warren Buffett" };
}

// For returning users, pick a random quote, but preserve it across the session
export function pickQuoteForDay() {
    // Check if we already picked one this session
    const cached = sessionStorage.getItem('qe_daily_quote_index');
    if (cached !== null) {
        return QUOTES[parseInt(cached, 10) % QUOTES.length];
    }
    // Pick a random one, avoiding the "new user" quote if possible
    const randomIndex = Math.floor(Math.random() * (QUOTES.length - 1)) + 1;
    sessionStorage.setItem('qe_daily_quote_index', randomIndex.toString());
    return QUOTES[randomIndex];
}

// ── Options data ──────────────────────────────────────────────────────────────
const QUAL_OPTIONS = [
    { value: 'student_school', label: '🎓 School Student', sub: ['Primary School (up to Class 8)', 'Higher Secondary (Class 9–12)'] },
    { value: 'student_college', label: '🎓 College / University Student', sub: ['STEM (Science, Technology, Engineering, Math)', 'Commerce / Business', 'Arts / Humanities', 'Other discipline'] },
    { value: 'working', label: '💼 Working Professional', sub: ['Finance / Banking / Capital Markets', 'Technology / Software', 'Healthcare / Pharma', 'Education / Research', 'Manufacturing / Industry', 'Other sector'] },
    { value: 'retired', label: '🏖 Retired', sub: [] },
    { value: 'other', label: '🌐 Other', sub: ['Self-employed / Freelance', 'Between jobs', 'Prefer not to say'] },
];

const PURPOSE_OPTIONS = [
    { value: 'academic', label: '📚 Academic research or coursework' },
    { value: 'literacy', label: '🔬 Personal financial literacy' },
    { value: 'professional', label: '🏛 Professional quantitative research' },
    { value: 'curiosity', label: '🤔 Curiosity about options pricing' },
    { value: 'fintech', label: '🖥 Learning about financial technology' },
    { value: 'exam_prep', label: '🎓 Preparing for finance examinations' },
];

// ── Helper: age from DOB string ───────────────────────────────────────────────
function calcAge(dob: string): number {
    if (!dob) return 0;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
    return age;
}

function ageGroup(age: number): string {
    if (age < 16) return '<16';
    if (age <= 25) return '16-25';
    if (age <= 40) return '26-40';
    if (age <= 60) return '41-60';
    return '60+';
}

// ── Step progress bar ─────────────────────────────────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
    return (
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i < current ? GREEN : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.3s',
                }} />
            ))}
        </div>
    );
}

// ── Option card ───────────────────────────────────────────────────────────────
function OptionCard({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6,
            background: selected ? 'rgba(0,212,160,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${selected ? 'rgba(0,212,160,0.5)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 7, cursor: 'pointer', transition: 'all 0.15s',
            fontSize: 12, ...MONO, color: selected ? GREEN : '#8899aa',
        }}>
            {selected ? '◉' : '○'} {label}
        </button>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Onboarding() {
    const navigate = useNavigate();
    const user = getUser();
    const token = getToken();
    const [step, setStep] = useState(1);
    const [dob, setDob] = useState('');
    const [qual, setQual] = useState('');
    const [subChoice, setSubChoice] = useState('');
    const [purpose, setPurpose] = useState('');
    const [saving, setSaving] = useState(false);

    const age = calcAge(dob);
    const isUnder16 = dob && age < 16;
    const selectedQual = QUAL_OPTIONS.find(q => q.value === qual);

    async function finish() {
        setSaving(true);
        try {
            if (token) {
                await fetch('/api/user/onboarding', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        date_of_birth: dob,
                        age_group: ageGroup(age),
                        qualification: qual,
                        sub_choice: subChoice,
                        purpose,
                    }),
                });
            }
        } catch { /* non-critical */ }
        localStorage.removeItem('qe_is_new_user');
        localStorage.setItem('qe_welcome_pending', '1'); // triggers welcome modal in dashboard
        navigate('/dashboard', { replace: true });
    }

    function skip() {
        localStorage.removeItem('qe_is_new_user');
        localStorage.setItem('qe_welcome_pending', '1');
        navigate('/dashboard', { replace: true });
    }

    const name = user?.name || 'there';

    return (
        <div style={{
            minHeight: '100vh', background: '#080b0f', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontFamily: "'Space Mono',monospace", position: 'relative', overflow: 'hidden',
        }}>
            {/* Subtle grid */}
            <div style={{ position: 'fixed', inset: 0, opacity: 0.025, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,212,160,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,160,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 540, padding: '0 24px' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.2em', marginBottom: 8 }}>QUANTEDGE · SETUP</div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px', fontFamily: "'Inter',sans-serif" }}>
                        Welcome, <span style={{ color: GREEN }}>{name}</span>
                    </h1>
                    <p style={{ fontSize: 11, color: '#4a5568', margin: 0, letterSpacing: '0.04em' }}>
                        Help us understand you better — takes 60 seconds
                    </p>
                </div>

                <div style={{ background: 'rgba(13,17,23,0.96)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '28px 32px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
                    <StepBar current={step} total={4} />

                    {/* ── Step 1: Profile ──────────────────────────────── */}
                    {step === 1 && (
                        <div>
                            <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.15em', marginBottom: 6 }}>STEP 1 OF 4 · YOUR PROFILE</div>
                            <h2 style={{ fontSize: 16, color: '#fff', fontFamily: "'Inter',sans-serif", margin: '0 0 20px' }}>Date of Birth</h2>

                            <label style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.15em', display: 'block', marginBottom: 6 }}>DATE OF BIRTH</label>
                            <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#e8edf2', fontSize: 12, ...MONO, outline: 'none', marginBottom: 16 }} />

                            {dob && (
                                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 11, color: '#8899aa', marginBottom: 12 }}>
                                    Age computed: <span style={{ color: '#fff' }}>{age} years</span> · Group: <span style={{ color: GREEN }}>{ageGroup(age)}</span>
                                </div>
                            )}

                            {isUnder16 && (
                                <div style={{ padding: '12px 16px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.35)', borderRadius: 8, marginBottom: 16 }}>
                                    <div style={{ fontSize: 12, color: '#f5a623', fontWeight: 700, marginBottom: 6 }}>⚠ Important Notice for Young Researchers</div>
                                    <div style={{ fontSize: 10, color: '#a07030', lineHeight: 1.7 }}>
                                        QuantEdge contains advanced quantitative finance concepts. We strongly recommend using this platform only under the guidance of a parent, teacher, or qualified adult mentor. This platform does not provide advice of any kind.
                                    </div>
                                </div>
                            )}

                            <button onClick={() => setStep(2)} disabled={!dob}
                                style={{ width: '100%', padding: '12px 0', background: dob ? 'rgba(0,212,160,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${dob ? 'rgba(0,212,160,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 7, color: dob ? GREEN : '#3d4f62', fontSize: 11, ...MONO, letterSpacing: '0.1em', cursor: dob ? 'pointer' : 'not-allowed' }}>
                                NEXT →
                            </button>
                        </div>
                    )}

                    {/* ── Step 2: Background ───────────────────────────── */}
                    {step === 2 && (
                        <div>
                            <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.15em', marginBottom: 6 }}>STEP 2 OF 4 · YOUR BACKGROUND</div>
                            <h2 style={{ fontSize: 16, color: '#fff', fontFamily: "'Inter',sans-serif", margin: '0 0 16px' }}>What best describes you?</h2>

                            {QUAL_OPTIONS.map(q => (
                                <OptionCard key={q.value} label={q.label} selected={qual === q.value}
                                    onClick={() => { setQual(q.value); setSubChoice(''); }} />
                            ))}

                            {selectedQual && selectedQual.sub.length > 0 && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.12em', marginBottom: 8 }}>
                                        {qual.startsWith('student') ? 'SELECT YOUR STREAM / LEVEL' : 'SELECT YOUR SECTOR'}
                                    </div>
                                    {selectedQual.sub.map(s => (
                                        <OptionCard key={s} label={s} selected={subChoice === s} onClick={() => setSubChoice(s)} />
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '11px 0', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: '#4a5568', fontSize: 11, ...MONO, cursor: 'pointer' }}>← BACK</button>
                                <button onClick={() => setStep(3)} disabled={!qual}
                                    style={{ flex: 2, padding: '11px 0', background: qual ? 'rgba(0,212,160,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${qual ? 'rgba(0,212,160,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 7, color: qual ? GREEN : '#3d4f62', fontSize: 11, ...MONO, letterSpacing: '0.1em', cursor: qual ? 'pointer' : 'not-allowed' }}>NEXT →</button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Purpose ──────────────────────────────── */}
                    {step === 3 && (
                        <div>
                            <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.15em', marginBottom: 6 }}>STEP 3 OF 4 · YOUR PURPOSE</div>
                            <h2 style={{ fontSize: 16, color: '#fff', fontFamily: "'Inter',sans-serif", margin: '0 0 16px' }}>Why are you using QuantEdge?</h2>

                            {PURPOSE_OPTIONS.map(p => (
                                <OptionCard key={p.value} label={p.label} selected={purpose === p.value} onClick={() => setPurpose(p.value)} />
                            ))}

                            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                <button onClick={() => setStep(2)} style={{ flex: 1, padding: '11px 0', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: '#4a5568', fontSize: 11, ...MONO, cursor: 'pointer' }}>← BACK</button>
                                <button onClick={() => setStep(4)} disabled={!purpose}
                                    style={{ flex: 2, padding: '11px 0', background: purpose ? 'rgba(0,212,160,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${purpose ? 'rgba(0,212,160,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 7, color: purpose ? GREEN : '#3d4f62', fontSize: 11, ...MONO, letterSpacing: '0.1em', cursor: purpose ? 'pointer' : 'not-allowed' }}>NEXT →</button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 4: Confirmation ─────────────────────────── */}
                    {step === 4 && (
                        <div>
                            <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.15em', marginBottom: 6 }}>STEP 4 OF 4 · CONFIRMATION</div>
                            <h2 style={{ fontSize: 16, color: '#fff', fontFamily: "'Inter',sans-serif", margin: '0 0 16px' }}>You're all set</h2>

                            {/* Summary */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                                {[
                                    ['Age Group', ageGroup(age)],
                                    ['Background', selectedQual?.label ?? '—'],
                                    ...(subChoice ? [['Specialisation', subChoice]] : []),
                                    ['Purpose', PURPOSE_OPTIONS.find(p => p.value === purpose)?.label ?? '—'],
                                ].map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 10 }}>
                                        <span style={{ color: '#4a5568', letterSpacing: '0.1em' }}>{k}</span>
                                        <span style={{ color: '#cbd5e0' }}>{v}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Disclaimer */}
                            <div style={{ padding: '10px 14px', background: 'rgba(255,77,109,0.06)', border: '1px solid rgba(255,77,109,0.2)', borderRadius: 6, fontSize: 9, color: '#ff8099', lineHeight: 1.7, marginBottom: 20, letterSpacing: '0.04em' }}>
                                QuantEdge is an educational and analytical system. It does not provide trading advice, investment recommendations, or financial services of any kind.
                            </div>

                            <button onClick={finish} disabled={saving}
                                style={{ width: '100%', padding: '13px 0', background: 'rgba(0,212,160,0.14)', border: '1px solid rgba(0,212,160,0.45)', borderRadius: 8, color: '#fff', fontSize: 12, ...MONO, letterSpacing: '0.12em', cursor: saving ? 'not-allowed' : 'pointer', marginBottom: 8 }}>
                                {saving ? '⟳ SAVING…' : '▶ GO TO DASHBOARD'}
                            </button>
                            <button onClick={() => { localStorage.removeItem('qe_is_new_user'); localStorage.setItem('qe_welcome_pending', '1'); navigate('/guide', { replace: true }); }}
                                style={{ width: '100%', padding: '11px 0', background: 'none', border: '1px solid rgba(0,212,160,0.2)', borderRadius: 8, color: GREEN, fontSize: 11, ...MONO, letterSpacing: '0.1em', cursor: 'pointer' }}>
                                📘 READ THE GUIDE FIRST
                            </button>
                        </div>
                    )}
                </div>

                {/* Skip link */}
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <button onClick={skip} style={{ background: 'none', border: 'none', color: '#2d3748', fontSize: 9, ...MONO, letterSpacing: '0.12em', cursor: 'pointer' }}>
                        SKIP SETUP AND GO TO DASHBOARD
                    </button>
                </div>
            </div>
        </div>
    );
}
