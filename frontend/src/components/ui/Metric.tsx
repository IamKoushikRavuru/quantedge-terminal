interface MetricProps {
    value: string | number;
    label: string;
    change?: string | number;
    positive?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 20, md: 28, lg: 36 };

export default function Metric({ value, label, change, positive, size = 'md' }: MetricProps) {
    return (
        <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: SIZES[size], fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {value}
            </div>
            {change != null && (
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: positive ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
                    {change}
                </div>
            )}
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
                {label}
            </div>
        </div>
    );
}
