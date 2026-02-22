/**
 * Phase 15 — QuantEdge Guide
 * ----------------------------
 * 9-section progressive learning page.
 * Zero finance assumption in sections 1-4.
 * Fully self-contained — works without API.
 *
 * Compliance rules:
 *  - No "buy / sell / trade / profit / returns" in instructional text
 *  - Every section ends with a comprehension note, not an action prompt
 *  - Disclaimer footer always visible
 */
import { useState, useCallback } from 'react';
import AskTheGuide from '../components/guide/AskTheGuide';

// ── Styles ────────────────────────────────────────────────────────────────────
const MONO: React.CSSProperties = { fontFamily: "'Space Mono',monospace" };
const BODY: React.CSSProperties = { fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 };
const CARD: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', marginBottom: 10 };
const TAG_GREEN: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', background: 'rgba(0,212,160,0.1)', border: '1px solid rgba(0,212,160,0.3)', borderRadius: 3, fontSize: 9, ...MONO, color: 'var(--green)', letterSpacing: '0.1em' };
const TAG_RED: React.CSSProperties = { ...TAG_GREEN, background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)', color: '#ff4d6d' };

// ── Glossary data ─────────────────────────────────────────────────────────────
const GLOSSARY = [
    {
        term: 'Implied Volatility (IV)',
        sentence: 'The market\'s expectation of future price movement, extracted from option prices via a pricing model.',
        analogy: 'Like a storm forecast: IV measures expected turbulence, not which direction the wind blows.',
        why: 'High IV = expensive options; low IV = cheap options — relative to historical norms.',
    },
    {
        term: 'Delta (Δ)',
        sentence: 'How much an option\'s price changes for a ₹1 move in the underlying stock.',
        analogy: 'Like a shadow — the stock (sun) moves, and delta tells you how fast the shadow (option price) follows.',
        why: 'Delta between 0 and 1 for calls; -1 to 0 for puts. Closer to 1 = more responsive to spot.',
    },
    {
        term: 'Gamma (Γ)',
        sentence: 'How quickly delta itself changes as the stock moves — the rate of change of delta.',
        analogy: 'If delta is speed, gamma is acceleration. High gamma = rapidly changing behaviour near expiry.',
        why: 'Gamma spikes near expiry; ignoring it can cause large unexpected exposure changes.',
    },
    {
        term: 'Vega (ν)',
        sentence: 'How much an option\'s price changes for a 1% shift in implied volatility.',
        analogy: 'Like a humidity sensor — vega tells you how reactive the option is to changes in market energy (IV).',
        why: 'High-vega options are more affected by volatility regimes, independent of spot direction.',
    },
    {
        term: 'Theta (θ)',
        sentence: 'How much value an option loses per day purely from the passage of time.',
        analogy: 'Like a melting ice cube — theta is the daily melt rate, regardless of what else happens.',
        why: 'This is why long options are called "wasting assets" — they lose value even in stable markets.',
    },
    {
        term: 'Volatility Skew',
        sentence: 'The difference in implied volatility across different strikes at the same expiry.',
        analogy: 'Like uneven insurance premiums — crash protection (puts) is priced more expensively than upside coverage.',
        why: 'Skew reflects asymmetric fear: markets historically fear crashes more than rallies.',
    },
    {
        term: 'Volatility Smile',
        sentence: 'A U-shaped pattern where deep ITM and OTM options have higher IV than ATM options.',
        analogy: 'The chart curve looks like a smile — both ends curve upward.',
        why: 'It shows that Black-Scholes\' lognormal assumption doesn\'t perfectly describe actual market prices.',
    },
    {
        term: 'Term Structure',
        sentence: 'How implied volatility varies across different expiry dates.',
        analogy: 'Like a multi-day weather forecast — near-term may be stormy, long-term may be calm.',
        why: 'Term structure shifts can signal upcoming events (earnings, policy meetings) priced into near options.',
    },
    {
        term: 'Residual (ML)',
        sentence: 'The gap between what Black-Scholes predicts and what the market actually prices.',
        analogy: 'Like the difference between a recipe\'s expected taste and how a dish actually turns out.',
        why: 'Large residuals mean the market is pricing in something the formula doesn\'t capture — not necessarily predictive.',
    },
    {
        term: 'Slippage',
        sentence: 'The difference between the expected price of an execution and the actual price received.',
        analogy: 'Like ordering a meal for ₹500 but being charged ₹515 for a "service fee" — the extra is slippage.',
        why: 'Slippage grows with order size and volatility. The Execution Sandbox models this deterministically.',
    },
    {
        term: 'Execution Risk',
        sentence: 'Uncertainty in how, when, and at what price an order gets filled.',
        analogy: 'Like sending a parcel — you know the destination, but arrival time and condition aren\'t guaranteed.',
        why: 'Even with perfect analysis, poor execution can change outcomes. The Sandbox exists to expose this.',
    },
];

// ── Example scenarios (5 seeds, rotates by date) ─────────────────────────────
const EXAMPLES = [
    {
        title: 'Understanding a Volatility Spike',
        context: 'The market releases unexpected inflation data. NSE opens with a gap.',
        numbers: { spot: 22100, atm_iv_before: 14.2, atm_iv_after: 22.8, change: '+60.6%' },
        steps: [
            'NIFTY spot is at ₹22,100. ATM IV is 14.2% — normal level.',
            'Inflation data surprises. Within minutes, ATM IV jumps to 22.8%.',
            'QuantEdge\'s volatility surface shows the near-term IV spiking while longer expiries remain calmer — a steep term structure.',
            'This means the market is pricing in short-term uncertainty, not long-term panic.',
            'Observation: IV change ≠ price direction. The surface tells you about expected movement size, not which way.',
        ],
        lesson: 'A volatility spike tells you the market is expecting larger price swings — not which direction they\'ll go.',
    },
    {
        title: 'Reading the Option Chain (Strike Selection)',
        context: 'A trader-analyst is studying OI concentration to understand where market participants are positioned.',
        numbers: { spot: 22400, key_strike_call: 22500, oi_call: 152000, key_strike_put: 22300, oi_put: 143000 },
        steps: [
            'NIFTY is at ₹22,400. The option chain shows the 22500 CE has 1,52,000 contracts of open interest.',
            'The 22300 PE also has 1,43,000 contracts — comparable concentration.',
            'QuantEdge\'s Chain page highlights this as a relatively balanced positioning around the current spot.',
            'The PCR (1.43/1.52 ≈ 0.94) is near neutral — neither extreme put-heavy nor call-heavy.',
            'Observation: High OI at a strike can indicate significance to participants — but it doesn\'t predict movement.',
        ],
        lesson: 'OI and PCR describe where participants are positioned. They describe structure, not future price direction.',
    },
    {
        title: 'Why Black-Scholes Has Residuals',
        context: 'Comparing model prices to market prices for NIFTY options.',
        numbers: { strike: 22000, bs_iv: 14.8, market_iv: 16.3, residual_pct: '+10.1%' },
        steps: [
            'Black-Scholes predicts the 22000 PE should imply IV of 14.8%, given current market parameters.',
            'The market is actually trading this put at an IV of 16.3%.',
            'The residual is 16.3 - 14.8 = 1.5 IV points, or about 10% above the model\'s expectation.',
            'QuantEdge\'s ML Insights visualises this residual. A positive residual on puts suggests the market is paying up for downside protection.',
            'Observation: The ML layer describes where the model and market disagree — it doesn\'t explain WHY or predict future alignment.',
        ],
        lesson: 'Residuals show where reality diverges from theory. Understanding them is analytical — not predictive.',
    },
    {
        title: 'Risk Constraints in the Execution Sandbox',
        context: 'Simulating a large hypothetical NIFTY CE order in the Execution Sandbox.',
        numbers: { qty: 500, delta_per_unit: 0.52, total_delta: 260, cap: 0.5, status: 'REJECTED' },
        steps: [
            'A researcher enters: 500 units of NIFTY 22400 CE (market order).',
            'Black-Scholes calculates delta of 0.52 per unit at current IV and spot.',
            'Total scaled delta = 500 × 0.52 = 260 — far above the 0.5 cap.',
            'The Execution Sandbox immediately rejects the order with a plain-English explanation.',
            'Observation: The rejection is the educational output. It shows why risk constraints exist — not to frustrate analysis, but to prevent outsized exposure.',
        ],
        lesson: 'The sandbox teaches execution risk by rejecting dangerous simulations loudly, with explanations.',
    },
    {
        title: 'The Volatility Surface — Reading the Shape',
        context: 'Interpreting a non-flat volatility surface for NIFTY.',
        numbers: { atm_iv: 14.8, otm_put_iv: 18.2, call_100_otm: 13.1, skew_ratio: 1.23 },
        steps: [
            'The ATM IV (at-the-money) is 14.8% — the baseline.',
            '100 points OTM puts are priced at 18.2% IV — significantly higher.',
            '100 points OTM calls are at 13.1% — below ATM.',
            'This asymmetry is the volatility skew. The surface slopes downward from puts to calls.',
            'QuantEdge\'s 3D surface shows this as a slanted plane — steeper on the put side.',
            'Observation: The skew shows the market values downside protection more than upside speculation.',
        ],
        lesson: 'A non-flat surface is normal and informative — it encodes the market\'s asymmetric risk preferences.',
    },
];

// ── Section nav config ────────────────────────────────────────────────────────
const SECTIONS = [
    { id: 's1', label: '1. What Is QuantEdge?' },
    { id: 's2', label: '2. What Is an Option?' },
    { id: 's3', label: '3. Why Prices Change' },
    { id: 's4', label: '4. Core Concept' },
    { id: 's5', label: '5. Feature Walkthrough' },
    { id: 's5b', label: '5b. Feature Usage Steps' },
    { id: 's6', label: '6. Common Mistakes' },
    { id: 's7', label: '7. How to Use Safely' },
    { id: 's8', label: '8. Glossary' },
    { id: 's9', label: '9. Fresh Example' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionHeader({ id, title, subtitle }: { id?: string; title: string; subtitle?: string }) {
    return (
        <div id={id} style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{title}</h2>
            {subtitle && <div style={{ fontSize: 10, ...MONO, color: 'var(--green)', letterSpacing: '0.12em' }}>{subtitle}</div>}
            <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(0,212,160,0.4), transparent)', marginTop: 10 }} />
        </div>
    );
}

function InfoBox({ children, accent = 'var(--green)' }: { children: React.ReactNode; accent?: string }) {
    return (
        <div style={{ padding: '10px 14px', background: `${accent}08`, border: `1px solid ${accent}30`, borderRadius: 6, ...BODY, marginBottom: 10, fontSize: 12 }}>
            {children}
        </div>
    );
}

function MythCard({ myth, truth }: { myth: string; truth: string }) {
    return (
        <div style={{ ...CARD, borderLeft: '3px solid #ff4d6d' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: 8, marginBottom: 6 }}>
                <span style={TAG_RED}>❌ MYTH</span>
                <span style={{ ...BODY, fontSize: 12, fontStyle: 'italic', color: 'var(--text-primary)' }}>{myth}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
                <span style={TAG_GREEN}>✓ REALITY</span>
                <span style={{ ...BODY, fontSize: 12 }}>{truth}</span>
            </div>
        </div>
    );
}

function FeatureBlock({ icon, title, desc, notInfer }: { icon: string; title: string; desc: string; notInfer: string }) {
    return (
        <div style={{ ...CARD, borderLeft: '3px solid rgba(0,212,160,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Inter',sans-serif" }}>{title}</span>
            </div>
            <div style={{ ...BODY, fontSize: 12, marginBottom: 8 }}>{desc}</div>
            <div style={{ fontSize: 10, ...MONO, color: 'rgba(255,77,109,0.8)', padding: '4px 0' }}>
                ⚠ Do NOT infer: {notInfer}
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QuantEdgeGuide() {
    const [glossSearch, setGlossSearch] = useState('');
    const [guideOpen, setGuideOpen] = useState(false);

    // Random example: seed by day-of-year
    const todayIndex = new Date().getDay() % EXAMPLES.length;
    const example = EXAMPLES[todayIndex];

    const scrollTo = useCallback((id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const filteredGloss = GLOSSARY.filter(g =>
        g.term.toLowerCase().includes(glossSearch.toLowerCase()) ||
        g.sentence.toLowerCase().includes(glossSearch.toLowerCase())
    );

    return (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px 1fr', height: '100%', overflow: 'hidden' }}>

            {/* ── Left nav (sticky) ───────────────────────────────────────────── */}
            <div style={{
                borderRight: '1px solid var(--border)', padding: '20px 12px',
                overflowY: 'auto', background: 'rgba(255,255,255,0.01)',
            }}>
                <div style={{ fontSize: 9, ...MONO, color: 'var(--green)', letterSpacing: '0.15em', marginBottom: 16 }}>TABLE OF CONTENTS</div>
                {SECTIONS.map(s => (
                    <button key={s.id}
                        onClick={() => scrollTo(s.id)}
                        style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '6px 8px', marginBottom: 2, borderRadius: 5,
                            fontSize: 10, ...MONO, color: 'var(--text-muted)',
                            letterSpacing: '0.04em', lineHeight: 1.4,
                            transition: 'color 0.15s, background 0.15s',
                        }}
                        onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--green)'; (e.target as HTMLElement).style.background = 'rgba(0,212,160,0.05)'; }}
                        onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--text-muted)'; (e.target as HTMLElement).style.background = 'none'; }}
                    >
                        {s.label}
                    </button>
                ))}

                {/* Ask the Guide toggle */}
                <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button
                        onClick={() => setGuideOpen(g => !g)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                            padding: '8px 8px', background: guideOpen ? 'rgba(0,212,160,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${guideOpen ? 'rgba(0,212,160,0.35)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 6, cursor: 'pointer',
                        }}
                    >
                        <span style={{ fontSize: 13 }}>📘</span>
                        <span style={{ fontSize: 9, ...MONO, color: 'var(--green)', letterSpacing: '0.08em' }}>
                            {guideOpen ? 'CLOSE GUIDE' : 'ASK THE GUIDE'}
                        </span>
                    </button>
                    <div style={{ fontSize: 8, ...MONO, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6, padding: '0 2px' }}>
                        Concept-only · Not an advisor
                    </div>
                </div>
            </div>

            {/* ── Right: Content ─────────────────────────────────────────────── */}
            <div style={{ overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 40 }}>

                {/* Top header */}
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px', fontFamily: "'Inter',sans-serif" }}>
                        QuantEdge Guide
                    </h1>
                    <div style={{ fontSize: 11, ...MONO, color: 'var(--green)', letterSpacing: '0.1em', marginBottom: 10 }}>
                        LEARN THE SYSTEM BEFORE YOU USE IT
                    </div>
                    <InfoBox>
                        This guide assumes no prior knowledge of finance, options, or mathematics. Start at Section 1 and work forward, or jump to any section using the navigation on the left.
                    </InfoBox>
                </div>

                {/* ── Section 1 ─────────────────────────────────────────────── */}
                <div id="s1">
                    <SectionHeader id="s1" title="1. What Is QuantEdge?" subtitle="ZERO FINANCE ASSUMPTION" />
                    <div style={{ ...BODY, marginBottom: 12 }}>
                        Imagine a very sophisticated weather station. It doesn't <em>control</em> the weather — it measures it, models it, and helps you understand what the atmosphere is doing right now and why. QuantEdge is the financial equivalent of that station.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                        {[
                            ['🚫 Not this', 'A tool that tells you what to buy or sell'],
                            ['🚫 Not this', 'A platform that predicts where prices will go'],
                            ['✓ This', 'A system that shows how options are priced, why prices change, and what the data structure looks like'],
                        ].map(([icon, desc]) => (
                            <div key={desc} style={{ ...CARD, borderLeft: `3px solid ${icon.includes('✓') ? 'var(--green)' : '#ff4d6d'}` }}>
                                <div style={{ fontSize: 16, marginBottom: 6 }}>{icon.split(' ')[0]}</div>
                                <div style={{ fontSize: 11, ...BODY }}>{desc}</div>
                            </div>
                        ))}
                    </div>
                    <InfoBox accent="rgba(0,212,160,1)">
                        <strong style={{ color: 'var(--text-primary)' }}>Why is it named QuantEdge?</strong> In financial markets, an "edge" doesn't mean knowing the future — it means having a structural advantage in how you process information. "Quant" refers to quantitative analysis: using rigorous mathematics, theoretical pricing models, and data science instead of gut feeling.
                        Most retail participants trade options blindly, relying on hope or charts. <strong>Your Edge</strong> comes from Quantitative understanding: seeing the hidden Greeks, visualising the volatility surface, and isolating the exact mathematical forces driving a premium. QuantEdge gives you the structural lens that institutional desks use.
                    </InfoBox>
                    <div style={{ fontSize: 10, ...MONO, color: 'var(--text-muted)', padding: '8px 0' }}>
                        QuantEdge does not connect to any broker, does not hold any capital, and does not provide trading, investment, or financial advice of any kind.
                    </div>
                </div>

                {/* ── Section 2 ─────────────────────────────────────────────── */}
                <div id="s2">
                    <SectionHeader id="s2" title="2. What Is an Option?" subtitle="FROM FIRST PRINCIPLES · NO FORMULAS YET" />
                    <div style={{ ...BODY, marginBottom: 12 }}>
                        Before using QuantEdge, you need to understand what an option is. Let's build this from scratch.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        <InfoBox>
                            <strong style={{ color: 'var(--text-primary)' }}>A stock</strong> is a share of a company. When you hold a stock, you own a fraction of the company. Its value moves with the company's fortunes.
                        </InfoBox>
                        <InfoBox>
                            <strong style={{ color: 'var(--text-primary)' }}>An option</strong> is a contract that gives someone the right — but not the obligation — to transact at a specific price, on or before a specific date.
                        </InfoBox>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        <div style={{ ...CARD }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', ...MONO, marginBottom: 6 }}>CALL OPTION (CE)</div>
                            <div style={{ ...BODY, fontSize: 12, marginBottom: 8 }}>The right to buy at the agreed price (strike).</div>
                            <div style={{ fontSize: 10, ...MONO, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                Analogy: A movie ticket purchased in advance at a fixed price. Even if the ticket price rises, you pay the old price. If the movie is cancelled, you lose only the ticket cost.
                            </div>
                        </div>
                        <div style={{ ...CARD }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#c77dff', ...MONO, marginBottom: 6 }}>PUT OPTION (PE)</div>
                            <div style={{ ...BODY, fontSize: 12, marginBottom: 8 }}>The right to sell at the agreed price (strike).</div>
                            <div style={{ fontSize: 10, ...MONO, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                Analogy: Insurance. You pay a premium. If something bad happens, you receive compensation. If nothing bad happens, you lose only the premium — and that's fine.
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <InfoBox>
                            <strong style={{ color: 'var(--text-primary)' }}>Strike price:</strong> The agreed price at which the transaction could happen. Like a restaurant reservation — you reserve a table at a known price, regardless of what menu prices do later.
                        </InfoBox>
                        <InfoBox>
                            <strong style={{ color: 'var(--text-primary)' }}>Expiry date:</strong> The date the option contract lapses. After this date, the contract is worthless regardless of conditions — like a voucher with an expiry stamped on it.
                        </InfoBox>
                    </div>
                </div>

                {/* ── Section 3 ─────────────────────────────────────────────── */}
                <div id="s3">
                    <SectionHeader id="s3" title="3. Why Option Prices Change" subtitle="THE FOUR FORCES" />
                    <div style={{ ...BODY, marginBottom: 12 }}>
                        Options change in price because of four forces — and this is where most people get confused. Understanding <em>why</em> an option price changed is the entire purpose of QuantEdge.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        {[
                            { icon: '⏳', title: 'Time Decay', color: '#f5a623', body: 'Every day that passes reduces an option\'s time value. Even if nothing else changes, options lose value over time. This is theta at work. Long before expiry, you have time value. On expiry day, there is none.' },
                            { icon: '🌊', title: 'Volatility', color: 'var(--green)', body: 'Higher expected movement = more valuable options. This makes intuitive sense: if you\'re buying insurance on a hurricane-prone coast, you pay more than for calm inland insurance. Uncertainty is priced in.' },
                            { icon: '📍', title: 'Spot Movement', color: '#c77dff', body: 'As the stock price moves, the option\'s relationship to the strike changes. An option that was far from the strike becomes relevant (or irrelevant). This is delta at work.' },
                            { icon: '💹', title: 'Interest Rates', color: '#00b4d8', body: 'Higher interest rates slightly increase call values and decrease put values — a mathematical effect of the cost of carrying capital. This is a secondary effect in most short-dated options analysis.' },
                        ].map(f => (
                            <div key={f.title} style={{ ...CARD, borderLeft: `3px solid ${f.color}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 18 }}>{f.icon}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Inter',sans-serif" }}>{f.title}</span>
                                </div>
                                <div style={{ ...BODY, fontSize: 12 }}>{f.body}</div>
                            </div>
                        ))}
                    </div>
                    <InfoBox accent="rgba(245,166,35,1)">
                        <strong style={{ color: 'var(--text-primary)' }}>The key insight:</strong> Even if you correctly predict the direction of the stock, an option can still lose value if time decay or a volatility collapse works against you. This is why "guessing direction" is insufficient — and why QuantEdge exists.
                    </InfoBox>
                </div>

                {/* ── Section 4 ─────────────────────────────────────────────── */}
                <div id="s4">
                    <SectionHeader id="s4" title="4. The Core Concept of QuantEdge" subtitle="VERY IMPORTANT — READ CAREFULLY" />
                    <div style={{ ...BODY, marginBottom: 16 }}>
                        QuantEdge is built on one foundational insight:
                    </div>
                    <div style={{ padding: '16px 20px', background: 'rgba(0,212,160,0.05)', border: '1px solid rgba(0,212,160,0.3)', borderRadius: 8, marginBottom: 16 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)', fontFamily: "'Inter',sans-serif", marginBottom: 8 }}>
                            "Markets already contain expectations. Options encode those expectations as implied volatility. Models translate expectations into numbers. QuantEdge visualises those translations."
                        </div>
                        <div style={{ fontSize: 11, ...BODY }}>
                            This platform is about <strong>understanding the market's expectations — not predicting the future.</strong>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                        {[
                            ['1', 'Markets price in collective knowledge', '↓'],
                            ['2', 'Options encode it as IV', '↓'],
                            ['3', 'Models translate IV to Greeks', '↓'],
                            ['4', 'QuantEdge visualises the translation', ''],
                        ].map(([num, text, arrow]) => (
                            <div key={num} style={{ textAlign: 'center' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,212,160,0.15)', border: '1px solid rgba(0,212,160,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 13, fontWeight: 700, color: 'var(--green)', ...MONO }}>{num}</div>
                                <div style={{ fontSize: 10, ...BODY, lineHeight: 1.5 }}>{text}</div>
                                {arrow && <div style={{ fontSize: 18, color: 'var(--green)', marginTop: 4 }}>{arrow}</div>}
                            </div>
                        ))}
                    </div>
                    <InfoBox>
                        A weather model doesn't <em>make</em> the weather — it describes the atmosphere's current state. QuantEdge doesn't make markets — it describes the information already embedded in option prices. This distinction is fundamental.
                    </InfoBox>
                </div>

                {/* ── Section 5 ─────────────────────────────────────────────── */}
                <div id="s5">
                    <SectionHeader id="s5" title="5. Feature-by-Feature Walkthrough" subtitle="WHAT EACH PAGE SHOWS · WHAT NOT TO INFER" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <FeatureBlock icon="📊" title="Dashboard"
                            desc="The dashboard shows a real-time market snapshot: spot prices, IV levels, PCR, OI summary, and Greeks for the ATM option. Each card is a live reading — like a cockpit with instruments active."
                            notInfer="High or low readings are not signals to act. A high IV reading tells you options are expensive relative to history — not that you should act on this." />
                        <FeatureBlock icon="⛓" title="Option Chain"
                            desc="Displays all available call and put contracts organised by strike. Greeks (delta, gamma, vega, theta) are shown per row. OI and volume show participation at each strike."
                            notInfer="High OI at a strike does not mean price will 'respect' that level. OI describes where capital is placed, not where price must go." />
                        <FeatureBlock icon="🌋" title="Volatility Surface"
                            desc="A 3D visualisation of implied volatility across all strikes and expiries. The shape reveals skew (put/call asymmetry), smile (U-shaped IV curve), and term structure (IV vs time)."
                            notInfer="A steep surface does not mean a crash is coming. It means the market is pricing in higher uncertainty — which could resolve in any direction." />
                        <FeatureBlock icon="🔬" title="Model Comparison"
                            desc="Compares Black-Scholes, Binomial, Monte Carlo, and Heston model prices across scenarios. Each model makes different assumptions. None is universally 'correct'."
                            notInfer="A model that gives a higher price is not 'better'. Appropriateness depends on the market condition and the specific question being asked." />
                        <FeatureBlock icon="🤖" title="ML Insights"
                            desc="Shows residuals — differences between Black-Scholes model prices and actual market prices. ML describes these gaps without trying to explain why or predict when they'll close."
                            notInfer="A large positive residual on a put does not mean that put is 'cheap'. Residuals are descriptive analytics — not mispricings to exploit." />
                        <FeatureBlock icon="📡" title="Signal Research"
                            desc="14 computed structural signals derived from option chain data (IV percentile, skew stability, GEX, PCR, etc.). Each shows current structural conditions with severity and confidence levels."
                            notInfer="A 'stressed' severity badge is not a trading signal. It describes the current structural state — not what will happen next." />
                        <FeatureBlock icon="🧪" title="Execution Sandbox"
                            desc="Simulates hypothetical order execution mechanics — fill probability, slippage, latency, and risk constraint enforcement. All results are diagnostic. Nothing is executed."
                            notInfer="A FILLED simulation result does not mean you should place this order. The sandbox exists to study execution friction — not to suggest positions." />
                    </div>
                </div>

                {/* ── Section 5b ────────────────────────────────────────────── */}
                <div id="s5b">
                    <SectionHeader id="s5b" title="5b. Step-by-Step Feature Usage" subtitle="HOW TO OPERATE EACH TOOL" />
                    <div style={{ ...BODY, marginBottom: 12 }}>
                        Here is precisely how to run each module and what output you should expect to see.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            {
                                f: 'Dashboard',
                                steps: ['Select a market symbol from your watchlist.', 'Read the IV vs VIX comparison cards.', 'Check the Put-Call Ratio and Open Interest summary.'],
                                out: 'A high-level snapshot of current market expectations versus historical norms.',
                            },
                            {
                                f: 'Option Chain',
                                steps: ['Select an expiry date.', 'Locate the At-The-Money (ATM) row, highlighted in blue.', 'Read the Greeks horizontally across the call and put sides for specific strikes.'],
                                out: 'The per-strike sensitivity profile (Greeks) for that specific expiry slice.',
                            },
                            {
                                f: 'Volatility Surface',
                                steps: ['Select a symbol.', 'Click and drag the 3D mesh to rotate it.', 'Observe where the mesh dips or spikes relative to moneyness and time.'],
                                out: 'A visual map showing exactly where implied volatility is elevated or depressed.',
                            },
                            {
                                f: 'Model Comparison',
                                steps: ['Enter Spot, Strike, Expiry, and IV inputs.', 'Click "Calculate pricing".', 'Compare the outputs of Black-Scholes, Binomial, Monte Carlo, and Heston.'],
                                out: 'Four different theoretical price estimates and a breakdown of their sensitivity differences.',
                            },
                            {
                                f: 'ML Insights',
                                steps: ['Select a symbol.', 'View the heatmap grid.', 'Read the residual magnitude in the cells (red/green hues).'],
                                out: 'A colour-coded map identifying where the market is pricing options differently than the Black-Scholes model expects.',
                            },
                            {
                                f: 'Signal Research',
                                steps: ['Filter signals by category (e.g. Volatility, Greeks, Flow).', 'Click to open a specific signal card.', 'Read the mathematical formula and severity confidence score.'],
                                out: 'Access to 14 distinct structural signals with explanations of their methodologies.',
                            },
                            {
                                f: 'Execution Sandbox',
                                steps: ['Set instrument, target strike, and quantity.', 'Adjust your institutional risk caps.', 'Click SIMULATE to run the order through the engine.'],
                                out: 'A detailed ledger showing fill probability, estimated slippage, and whether the order passed or failed risk constraints.',
                            }
                        ].map(item => (
                            <div key={item.f} style={{ ...CARD, padding: '16px 20px', borderLeft: '3px solid var(--green)' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Inter',sans-serif", marginBottom: 12 }}>{item.f}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1px minmax(0, 1fr)', gap: 20 }}>
                                    <div>
                                        <div style={{ fontSize: 9, ...MONO, color: '#8899aa', letterSpacing: '0.12em', marginBottom: 8 }}>USAGE STEPS</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {item.steps.map((step, i) => (
                                                <div key={i} style={{ display: 'flex', gap: 8 }}>
                                                    <span style={{ color: 'var(--green)', ...MONO, fontSize: 11 }}>{i + 1}.</span>
                                                    <span style={{ ...BODY, fontSize: 12, lineHeight: 1.5 }}>{step}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ background: 'var(--border)' }} />
                                    <div>
                                        <div style={{ fontSize: 9, ...MONO, color: '#8899aa', letterSpacing: '0.12em', marginBottom: 8 }}>EXPECTED OUTPUT</div>
                                        <div style={{ ...BODY, fontSize: 12, lineHeight: 1.6, padding: '10px 14px', background: 'rgba(0,212,160,0.06)', borderRadius: 6, border: '1px solid rgba(0,212,160,0.15)' }}>
                                            {item.out}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Section 6 ─────────────────────────────────────────────── */}
                <div id="s6">
                    <SectionHeader id="s6" title="6. Common Beginner Misunderstandings" subtitle="PREVENTATIVE KNOWLEDGE" />
                    <div style={{ ...BODY, marginBottom: 12 }}>
                        These are the most frequent misreadings of market data. Understanding them now saves considerable confusion later.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <MythCard myth='"High IV means the price will go up"' truth="IV measures expected movement size — not direction. High IV means larger moves are expected, not upward moves. Directional forecasting is a completely separate (and unreliable) endeavour." />
                        <MythCard myth='"More data means more certainty"' truth="More data often reveals more complexity and more sources of ambiguity. QuantEdge shows you more data to deepen understanding — not to increase confidence in any single outcome." />
                        <MythCard myth='"ML predicts where the market is going"' truth="The ML layer in QuantEdge describes residuals — gaps between model and market. It does not predict future prices. Using it as a prediction engine would be a fundamental misuse." />
                        <MythCard myth='"High OI at a strike means price will stay there"' truth="OI is a measure of outstanding contracts, not a magnetic force on price. It describes positioning, not barriers. Price can and often does move through high-OI strikes." />
                        <MythCard myth='"A FILLED result in the sandbox means this is a good order"' truth="The Execution Sandbox only tests whether an order passes risk constraints and estimates fill mechanics. It says nothing about the potential future outcome of any position." />
                        <MythCard myth='"Delta tells me how much money I will make"' truth="Delta is an instantaneous rate of change — it shifts constantly as spot, time, and IV change (due to gamma and vega). It is not a profit estimate." />
                    </div>
                </div>

                {/* ── Section 7 ─────────────────────────────────────────────── */}
                <div id="s7">
                    <SectionHeader id="s7" title="7. How to Use QuantEdge Safely" subtitle="ETHICAL FRAMING" />
                    <div style={{ ...BODY, marginBottom: 12 }}>
                        QuantEdge rewards patience. The system is designed for researchers who observe first and assume later — not for those seeking rapid confirmation of existing beliefs.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                        {[
                            ['👁 Observe First', 'Spend time looking at how the data changes across sessions, symbols, and market conditions before drawing any interpretations.'],
                            ['🧠 Learn Before Assuming', 'Read the Glossary. Watch the surface change. Compare model outputs. Understanding the vocabulary and mechanics is the first milestone.'],
                            ['🐢 Slow Understanding > Fast Decisions', 'The value of QuantEdge compounds with familiarity. A user who has observed 50 market sessions will read the data very differently from one who has seen 5.'],
                        ].map(([title, body]) => (
                            <div key={title as string} style={{ ...CARD, textAlign: 'center' }}>
                                <div style={{ fontSize: 24, marginBottom: 8 }}>{(title as string).split(' ')[0]}</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Inter',sans-serif", marginBottom: 6 }}>{(title as string).split(' ').slice(1).join(' ')}</div>
                                <div style={{ ...BODY, fontSize: 11 }}>{body as string}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '14px 18px', background: 'rgba(255,77,109,0.05)', border: '1px solid rgba(255,77,109,0.25)', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#ff4d6d', fontFamily: "'Inter',sans-serif", marginBottom: 6 }}>⚠ Mandatory Disclaimer</div>
                        <div style={{ ...BODY, fontSize: 12 }}>
                            QuantEdge is an educational and analytical system. It does not provide trading advice, investment recommendations, or financial services of any kind. All data is displayed for research and learning purposes only. No action should be taken based solely on what this platform shows.
                        </div>
                    </div>
                </div>

                {/* ── Section 8 — Glossary ─────────────────────────────────── */}
                <div id="s8">
                    <SectionHeader id="s8" title="8. Glossary" subtitle="SEARCHABLE DEFINITIONS" />
                    <div style={{ marginBottom: 12 }}>
                        <input
                            value={glossSearch}
                            onChange={e => setGlossSearch(e.target.value)}
                            placeholder="Search terms: IV, delta, gamma, theta, vega, skew…"
                            style={{
                                width: '100%', padding: '8px 12px', fontSize: 11, ...MONO,
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 6, color: 'var(--text-primary)', outline: 'none',
                            }}
                        />
                    </div>
                    {filteredGloss.length === 0 ? (
                        <div style={{ ...BODY, fontSize: 11, color: 'var(--text-muted)' }}>No terms match your search.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {filteredGloss.map(g => (
                                <div key={g.term} style={{ ...CARD }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', fontFamily: "'Inter',sans-serif", marginBottom: 6 }}>{g.term}</div>
                                    <div style={{ ...BODY, fontSize: 12, marginBottom: 6 }}>{g.sentence}</div>
                                    <div style={{ padding: '6px 10px', background: 'rgba(0,212,160,0.05)', border: '1px solid rgba(0,212,160,0.15)', borderRadius: 5, fontSize: 11, ...BODY, marginBottom: 6 }}>
                                        <strong style={{ color: 'var(--green)', fontSize: 9, ...MONO }}>ANALOGY: </strong>{g.analogy}
                                    </div>
                                    <div style={{ fontSize: 10, ...MONO, color: 'var(--text-muted)' }}>
                                        💡 Why it matters: {g.why}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Section 9 — Example Generator ────────────────────────── */}
                <div id="s9">
                    <SectionHeader id="s9" title="9. Fresh Example" subtitle="TODAY'S LEARNING SCENARIO" />
                    <InfoBox>
                        A new scenario is loaded each session. These use illustrative (not real) numbers to walk through how QuantEdge data should be read. The numbers change across sessions to prevent rote pattern memorisation.
                    </InfoBox>
                    <div style={{ ...CARD, borderLeft: '3px solid var(--green)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <span style={TAG_GREEN}>TODAY'S SCENARIO</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Inter',sans-serif" }}>{example.title}</span>
                        </div>
                        <div style={{ ...BODY, fontSize: 12, marginBottom: 12, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                            Context: {example.context}
                        </div>

                        {/* Numbers */}
                        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 14 }}>
                            {Object.entries(example.numbers).map(([k, v]) => (
                                <div key={k} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 5 }}>
                                    <div style={{ fontSize: 8, ...MONO, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{k.replace(/_/g, ' ')}</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', ...MONO }}>{String(v)}</div>
                                </div>
                            ))}
                        </div>

                        {/* Steps */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 9, ...MONO, color: 'var(--green)', letterSpacing: '0.12em', marginBottom: 8 }}>STEP-BY-STEP WALKTHROUGH</div>
                            {example.steps.map((step, i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,212,160,0.15)', border: '1px solid rgba(0,212,160,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--green)', ...MONO, flexShrink: 0 }}>{i + 1}</div>
                                    <div style={{ ...BODY, fontSize: 12, paddingTop: 3 }}>{step}</div>
                                </div>
                            ))}
                        </div>

                        {/* Lesson */}
                        <div style={{ padding: '10px 14px', background: 'rgba(0,212,160,0.07)', border: '1px solid rgba(0,212,160,0.25)', borderRadius: 6 }}>
                            <div style={{ fontSize: 9, ...MONO, color: 'var(--green)', letterSpacing: '0.12em', marginBottom: 4 }}>KEY LESSON</div>
                            <div style={{ ...BODY, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{example.lesson}</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 9, ...MONO, color: 'var(--text-muted)', letterSpacing: '0.08em', lineHeight: 1.8 }}>
                    <div>This guide exists to reduce confusion, not to influence decisions.</div>
                    <div style={{ marginTop: 4 }}>QuantEdge is an educational and analytical system. It does not provide trading advice. © QuantEdge Research {new Date().getFullYear()}</div>
                </div>
            </div>

            {/* ── AI Guide Panel ─────────────────────────────────────────────── */}
            {guideOpen && <AskTheGuide onDismiss={() => setGuideOpen(false)} />}
        </div>
    );
}
