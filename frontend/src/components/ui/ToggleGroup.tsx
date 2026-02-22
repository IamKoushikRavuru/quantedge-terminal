interface Option { label: string; value: string; }
interface ToggleGroupProps {
    options: Option[];
    value: string;
    onChange: (v: string) => void;
}

export default function ToggleGroup({ options, value, onChange }: ToggleGroupProps) {
    return (
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', fontFamily: "'Space Mono',monospace", fontSize: 10 }}>
            {options.map(o => (
                <button
                    key={o.value}
                    onClick={() => onChange(o.value)}
                    style={{
                        padding: '5px 14px', cursor: 'pointer', letterSpacing: '0.05em',
                        border: 'none', transition: 'all 0.15s',
                        background: value === o.value ? 'var(--bg-card)' : 'transparent',
                        color: value === o.value ? 'var(--text-primary)' : 'var(--text-muted)',
                        boxShadow: value === o.value ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                    }}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
