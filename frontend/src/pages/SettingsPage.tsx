import { useSettings } from '../hooks/useSettings';

export default function SettingsPage() {
    const { settings, setTheme, setZoom, reset } = useSettings();

    return (
        <div style={{ padding: '24px 32px', maxWidth: 800, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px', fontFamily: "'Inter', sans-serif" }}>Platform Settings</h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Configure your display preferences.</p>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Display Theme</span>
                </div>
                <div className="card-body">
                    <div style={{ display: 'flex', gap: 16 }}>
                        <button
                            onClick={() => setTheme('dark')}
                            style={{
                                padding: '16px 24px',
                                border: `2px solid ${settings.theme === 'dark' ? 'var(--green)' : 'var(--border)'}`,
                                borderRadius: 8,
                                background: settings.theme === 'dark' ? 'var(--green-dim)' : 'transparent',
                                color: settings.theme === 'dark' ? 'var(--green)' : 'var(--text-primary)',
                                flex: 1, cursor: 'pointer', fontFamily: "'Space Mono', monospace",
                                transition: 'all 0.2s ease'
                            }}>
                            🌙 DARK MODE
                        </button>
                        <button
                            onClick={() => setTheme('light')}
                            style={{
                                padding: '16px 24px',
                                border: `2px solid ${settings.theme === 'light' ? 'var(--green)' : 'var(--border)'}`,
                                borderRadius: 8,
                                background: settings.theme === 'light' ? 'var(--green-dim)' : 'transparent',
                                color: settings.theme === 'light' ? 'var(--green)' : 'var(--text-primary)',
                                flex: 1, cursor: 'pointer', fontFamily: "'Space Mono', monospace",
                                transition: 'all 0.2s ease'
                            }}>
                            ☀️ LIGHT MODE
                        </button>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header flex-col" style={{ alignItems: 'flex-start' }}>
                    <span className="card-title">Application Zoom</span>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Adjust specifically if your browser's default zoom makes the terminal difficult to read.
                        Current scale: <span style={{ color: 'var(--green)', fontFamily: "'Space Mono', monospace" }}>{Math.round(settings.zoom * 100)}%</span>
                    </p>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: 'var(--text-muted)' }}>Smaller A</span>
                        <input
                            type="range"
                            min="0.8" max="1.4" step="0.05"
                            value={settings.zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--green)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 14, fontFamily: "'Space Mono', monospace", color: 'var(--text-muted)' }}>Larger A</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        {[0.9, 1.0, 1.1, 1.2].map(z => (
                            <button
                                key={z}
                                onClick={() => setZoom(z)}
                                style={{
                                    padding: '8px 16px', background: 'transparent',
                                    border: '1px solid var(--border)', borderRadius: 6,
                                    color: 'var(--text-muted)', cursor: 'pointer',
                                    flex: 1, transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                Reset {Math.round(z * 100)}%
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 16 }}>
                <button
                    onClick={reset}
                    style={{
                        padding: '10px 24px', background: 'rgba(255, 77, 109, 0.05)',
                        border: '1px solid rgba(255, 77, 109, 0.3)', borderRadius: 6,
                        color: 'var(--red)', cursor: 'pointer', fontFamily: "'Space Mono', monospace",
                        fontSize: 11, letterSpacing: '0.05em'
                    }}
                >
                    RESET TO DEFAULTS
                </button>
            </div>
        </div>
    );
}
