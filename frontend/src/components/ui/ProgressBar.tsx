interface ProgressBarProps {
    value: number;   // 0–100
    color?: string;
    label?: string;
    right?: string;
}

export default function ProgressBar({ value, color = 'var(--green)', label, right }: ProgressBarProps) {
    return (
        <div>
            {(label || right) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    {label && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Space Mono',monospace" }}>{label}</span>}
                    {right && <span style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: 'var(--text-primary)' }}>{right}</span>}
                </div>
            )}
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, value))}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
            </div>
        </div>
    );
}
