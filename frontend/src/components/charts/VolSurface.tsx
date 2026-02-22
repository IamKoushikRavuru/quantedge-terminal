// SVG skeleton 3D vol surface (design-accurate placeholder matching index.html)
export default function VolSurface() {
    return (
        <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, rgba(0,212,160,0.03) 0%, transparent 70%)',
            position: 'relative', overflow: 'hidden', borderRadius: 8
        }}>
            {/* Background grid */}
            <div style={{
                position: 'absolute', inset: 0, backgroundImage:
                    'linear-gradient(rgba(0,212,160,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,160,0.04) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }} />

            <svg width="500" height="300" viewBox="0 0 500 300" style={{ position: 'relative', zIndex: 2 }}>
                <g opacity="0.6">
                    <path d="M50 250 Q175 240 300 245 Q425 250 480 245" fill="none" stroke="rgba(0,212,160,0.2)" strokeWidth="1" />
                    <path d="M70 220 Q185 205 305 210 Q420 215 475 210" fill="none" stroke="rgba(0,212,160,0.25)" strokeWidth="1" />
                    <path d="M85 190 Q195 170 310 175 Q415 180 468 173" fill="none" stroke="rgba(0,212,160,0.3)" strokeWidth="1" />
                    <path d="M95 160 Q200 130 315 140 Q408 148 460 138" fill="none" stroke="rgba(0,212,160,0.35)" strokeWidth="1" />
                    <path d="M100 130 Q205 90 318 105 Q402 118 452 104" fill="none" stroke="rgba(0,212,160,0.4)" strokeWidth="1" />
                    <path d="M102 100 Q208 52 320 72 Q396 88 444 70" fill="none" stroke="rgba(0,212,160,0.45)" strokeWidth="1.5" />
                    <path d="M103 82 Q209 35 321 54 Q394 72 441 52" fill="none" stroke="rgba(0,212,160,0.7)" strokeWidth="2" />
                    <path d="M103 70 Q210 22 322 42 Q393 58 440 38" fill="none" stroke="rgba(0,212,160,0.5)" strokeWidth="1.5" />
                    <path d="M104 62 Q211 15 323 34 Q392 50 439 28" fill="none" stroke="rgba(0,212,160,0.3)" strokeWidth="1" />
                </g>
                <g opacity="0.5">
                    {[{ a: [50, 250, 103, 70] }, { a: [110, 248, 155, 74] }, { a: [180, 246, 217, 60] }, { a: [240, 246, 272, 50] },
                    { a: [300, 245, 325, 45] }, { a: [360, 245, 378, 42] }, { a: [420, 247, 428, 48] }, { a: [478, 245, 440, 38] }].map((l, i) => (
                        <path key={i} d={`M${l.a[0]} ${l.a[1]} L${l.a[2]} ${l.a[3]}`} fill="none" stroke="rgba(77,159,255,0.2)" strokeWidth="1" />
                    ))}
                </g>
                <circle cx="321" cy="54" r="5" fill="var(--green)" opacity="0.9">
                    <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite" />
                </circle>
                <text x="440" y="265" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="Space Mono">STRIKE →</text>
                <text x="30" y="140" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="Space Mono" transform="rotate(-90,30,140)">IV →</text>
                <text x="460" y="200" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="Space Mono">EXPIRY →</text>
                <text x="315" y="46" fill="var(--green)" fontSize="9" fontFamily="Space Mono" opacity="0.8">ATM</text>
            </svg>

            <div style={{ position: 'absolute', bottom: 16, right: 16, textAlign: 'right', color: 'var(--text-muted)', fontSize: 11, fontFamily: "'Space Mono',monospace", zIndex: 3 }}>
                <span>3D SURFACE · LIVE DATA</span>
            </div>
        </div>
    );
}
