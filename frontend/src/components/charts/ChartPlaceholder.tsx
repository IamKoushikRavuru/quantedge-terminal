interface ChartPlaceholderProps {
    label: string;
    style?: React.CSSProperties;
}

export default function ChartPlaceholder({ label, style }: ChartPlaceholderProps) {
    return (
        <div style={{
            background: 'rgba(0,0,0,0.2)', borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: 9,
            fontFamily: "'Space Mono',monospace", letterSpacing: '0.08em', textTransform: 'uppercase',
            border: '1px dashed var(--border)',
            ...style,
        }}>
            {label}
        </div>
    );
}
