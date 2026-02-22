export default function DeveloperInfo() {
    return (
        <div style={{ padding: '24px 32px', maxWidth: 800, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px', fontFamily: "'Inter', sans-serif" }}>About the Developer</h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace" }}>SYSTEM ARCHITECT · QUANTITATIVE ENGINEERING</p>
                <div style={{ height: 1, background: 'linear-gradient(90deg, var(--green), transparent)', marginTop: 16 }}></div>
            </div>

            <div className="card" style={{ borderLeft: '3px solid var(--green)' }}>
                <div className="card-header">
                    <span className="card-title" style={{ color: 'var(--text-primary)', fontSize: 18, textTransform: 'none' }}>Koushik Ravuru</span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Contact Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                        <div>
                            <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'var(--text-muted)', marginBottom: 4 }}>EMAIL</div>
                            <a href="mailto:iamkoushikravuru@gmail.com" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none' }}>iamkoushikravuru@gmail.com</a>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'var(--text-muted)', marginBottom: 4 }}>LOCATION</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>VIT Chennai</div>
                        </div>
                    </div>

                    {/* Description Blocks */}
                    <div style={{
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                    }}>
                        <p>
                            I’m a Computer Science undergraduate at VIT Chennai with strong interests in quantitative finance, derivatives pricing, and market analytics.
                        </p>

                        <div style={{ padding: '16px 20px', background: 'var(--green-dim)', border: '1px solid rgba(0,212,160,0.3)', borderRadius: 8 }}>
                            <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                                I work as a data analyst, applying statistical analysis, visualization, and modeling to extract insight from complex datasets. My focus lies at the intersection of financial theory, data science, and software engineering, especially option pricing and volatility analysis.
                            </p>
                        </div>

                        <p>
                            I’m particularly interested in understanding the limits of machine learning in finance and using it responsibly alongside classical models. I enjoy building rigorous backend systems and intuitive analytical interfaces for financial decision support.
                        </p>
                    </div>

                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'var(--text-muted)', textAlign: 'center' }}>
                            © {new Date().getFullYear()} QuantEdge Terminal Prototype
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
