interface SparklineProps {
    data: number[];   // raw values, will be normalized
    color?: string;
    width?: number;
    height?: number;
}

export default function Sparkline({ data, color = 'var(--green)', width = 140, height = 40 }: SparklineProps) {
    if (!data || data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const toX = (i: number) => (i / (data.length - 1)) * width;
    const toY = (v: number) => height - ((v - min) / range) * (height - 4) - 2;

    const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
    const area = `${d} L${width},${height} L0,${height} Z`;

    const gradId = `sg-${color.replace(/[^a-z0-9]/gi, '')}`;

    return (
        <div style={{ width, height, overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} preserveAspectRatio="none">
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={area} fill={`url(#${gradId})`} />
                <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
            </svg>
        </div>
    );
}
