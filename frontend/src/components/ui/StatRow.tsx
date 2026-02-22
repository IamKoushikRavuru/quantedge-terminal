import React from 'react';

interface StatRowProps {
    label: string;
    value: React.ReactNode;
    accent?: string;
}

export default function StatRow({ label, value, accent }: StatRowProps) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 11 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace", fontSize: 10 }}>{label}</span>
            <span style={{ fontFamily: "'Space Mono',monospace", color: accent ?? 'var(--text-primary)' }}>{value}</span>
        </div>
    );
}
