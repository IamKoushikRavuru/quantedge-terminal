import React from 'react';

interface CardProps {
    title?: string;
    badge?: React.ReactNode;
    children: React.ReactNode;
    variant?: 'default' | 'glass';
    className?: string;
    style?: React.CSSProperties;
}

export default function Card({ title, badge, children, variant = 'default', className, style }: CardProps) {
    const bg = variant === 'glass' ? 'rgba(17,24,32,0.8)' : 'var(--bg-card)';
    const extra = variant === 'glass' ? { backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' } : {};

    return (
        <div
            className={className}
            style={{
                background: bg, border: '1px solid var(--border)', borderRadius: 8,
                overflow: 'hidden', transition: 'border-color 0.2s ease',
                ...extra, ...style,
            }}
        >
            {title != null && (
                <div style={{
                    padding: '10px 14px', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        {title}
                    </span>
                    {badge}
                </div>
            )}
            <div style={{ padding: 14 }}>{children}</div>
        </div>
    );
}
