/**
 * Phase 15 — AskTheGuide Component
 * -----------------------------------
 * A small, dismissible concept-guide chat panel.
 * Labelled "Concept Guide" — never "AI Advisor".
 *
 * Hard rules enforced client-side:
 *  - Refuses trading/prediction questions before sending to API
 *  - Cannot suggest trades, strategies, or compare outcomes
 *  - Offline fallback when API is unavailable
 */
import { useState, useRef, useEffect, useCallback } from 'react';

interface Message { role: 'user' | 'guide'; text: string; refused?: boolean; }

const MONO: React.CSSProperties = { fontFamily: "'Space Mono',monospace" };

const CLIENT_REFUSE_KEYWORDS = [
    'buy', 'sell', 'invest', 'profit', 'strategy', 'trade', 'returns',
    'should i', 'will it', 'predict', 'entry', 'exit', 'long', 'short', 'best option'
];

const CLIENT_REFUSE_MSG =
    "I can explain concepts and platform features, but I can't advise on positions or outcomes. " +
    "Try asking: \"What is delta?\" or \"How does the volatility surface work?\"";

function isRefused(q: string) {
    const lower = q.toLowerCase();
    return CLIENT_REFUSE_KEYWORDS.some(kw => lower.includes(kw));
}

interface Props {
    context?: string; // e.g. "/chain" or "/dashboard"
    onDismiss: () => void;
}

export default function AskTheGuide({ context, onDismiss }: Props) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'guide',
            text: "Hi — I'm the Concept Guide. Ask me what any QuantEdge term or feature means. " +
                "I can't give trading advice, but I can explain the platform clearly."
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const tutorialFiredRef = useRef(false);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const requestTutorial = useCallback(async (ctxPath: string) => {
        setLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
            const r = await fetch(`${API_BASE}/api/guide/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: "how to use this page", context: ctxPath }),
            });
            if (r.ok) {
                const data = await r.json();
                setMessages(prev => [...prev, {
                    role: 'guide',
                    text: data.answer,
                    refused: data.refused,
                }]);
            }
        } catch {
            // silent fail for auto-tutorials
        }
        setLoading(false);
    }, []);

    // Auto-fire tutorial for this context if provided
    useEffect(() => {
        if (context && !tutorialFiredRef.current) {
            tutorialFiredRef.current = true;
            // Short delay to let the animation finish before sending the message
            setTimeout(() => requestTutorial(context), 400);
        }
    }, [context, requestTutorial]);

    const send = useCallback(async () => {
        const q = input.trim();
        if (!q || loading) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: q }]);

        // Client-side refuse check
        if (isRefused(q)) {
            setMessages(prev => [...prev, { role: 'guide', text: CLIENT_REFUSE_MSG, refused: true }]);
            return;
        }

        setLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
            const r = await fetch(`${API_BASE}/api/guide/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: q, context }), // pass context to help routing
            });
            if (r.ok) {
                const data = await r.json();
                setMessages(prev => [...prev, {
                    role: 'guide',
                    text: data.answer,
                    refused: data.refused,
                }]);
            } else {
                throw new Error();
            }
        } catch {
            // Offline fallback
            setMessages(prev => [...prev, {
                role: 'guide',
                text: "I couldn't reach the guide server, but the Glossary in Section 8 covers all key terms offline.",
            }]);
        }
        setLoading(false);
    }, [input, loading]);

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24, width: 340, zIndex: 9000,
            background: 'var(--bg-card)', border: '1px solid rgba(0,212,160,0.3)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderBottom: '1px solid var(--border)',
                background: 'rgba(0,212,160,0.05)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>📘</span>
                    <span style={{ fontSize: 10, ...MONO, color: 'var(--green)', letterSpacing: '0.12em', fontWeight: 700 }}>
                        CONCEPT GUIDE
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 7, ...MONO, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                        CONCEPTS ONLY
                    </span>
                    {context && (
                        <button
                            onClick={() => requestTutorial(context)}
                            style={{
                                background: 'rgba(0,212,160,0.1)', border: '1px solid rgba(0,212,160,0.3)',
                                color: 'var(--green)', cursor: 'pointer', fontSize: 9, padding: '2px 6px',
                                borderRadius: 4, ...MONO, marginLeft: 4
                            }}
                            title="Replay Tutorial"
                        >
                            REPLAY
                        </button>
                    )}
                    <button
                        onClick={onDismiss}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}
                        title="Dismiss"
                    >×</button>
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', maxHeight: 320, minHeight: 160 }}>
                {messages.map((m, i) => (
                    <div key={i} style={{
                        marginBottom: 10,
                        display: 'flex',
                        justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                    }}>
                        <div style={{
                            maxWidth: '85%', padding: '7px 10px', borderRadius: 7, fontSize: 10,
                            ...MONO, lineHeight: 1.65,
                            background: m.role === 'user'
                                ? 'rgba(0,212,160,0.12)'
                                : m.refused
                                    ? 'rgba(255,77,109,0.06)'
                                    : 'rgba(255,255,255,0.04)',
                            border: m.role === 'user'
                                ? '1px solid rgba(0,212,160,0.25)'
                                : m.refused
                                    ? '1px solid rgba(255,77,109,0.2)'
                                    : '1px solid var(--border)',
                            color: m.refused ? '#ff8099' : 'var(--text-secondary)',
                        }}>
                            {m.refused && <span style={{ fontSize: 9, color: '#ff4d6d', display: 'block', marginBottom: 4 }}>⚠ Question outside scope</span>}
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div style={{ fontSize: 9, ...MONO, color: 'var(--text-muted)', padding: '4px 0' }}>
                        Looking up concept…
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Ask e.g. 'what is vega?'"
                    style={{
                        flex: 1, padding: '6px 8px', fontSize: 10, ...MONO,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 5, color: 'var(--text-primary)', outline: 'none',
                    }}
                    disabled={loading}
                />
                <button
                    onClick={send}
                    disabled={loading || !input.trim()}
                    style={{
                        padding: '6px 10px', fontSize: 10, ...MONO,
                        background: input.trim() ? 'rgba(0,212,160,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${input.trim() ? 'rgba(0,212,160,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 5, color: 'var(--green)', cursor: input.trim() ? 'pointer' : 'not-allowed',
                    }}
                >ASK</button>
            </div>

            {/* Footer */}
            <div style={{ padding: '5px 12px 8px', fontSize: 7, ...MONO, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                This guide explains concepts only. It does not provide trading, investment, or financial advice.
            </div>
        </div>
    );
}
