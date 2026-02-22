import type { ResidualCell } from '../../types';

interface HeatmapGridProps {
    cells: ResidualCell[];
    rows: number;
    cols: number;
}

function errorToColor(e: number): string {
    if (e < 0.003) return 'rgba(0,212,160,0.3)';
    if (e < 0.006) return 'rgba(0,212,160,0.6)';
    if (e < 0.01) return 'rgba(245,166,35,0.5)';
    if (e < 0.015) return 'rgba(255,77,109,0.4)';
    return 'rgba(255,77,109,0.8)';
}

export default function HeatmapGrid({ cells, rows, cols }: HeatmapGridProps) {
    const matrix: (ResidualCell | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
    cells.forEach(c => {
        if (c.expiryIndex < rows && c.strikeIndex < cols) matrix[c.expiryIndex][c.strikeIndex] = c;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {matrix.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap: 2 }}>
                    {row.map((cell, ci) => (
                        <div
                            key={ci}
                            title={cell ? `Error: ${(cell.error * 100).toFixed(3)}%` : ''}
                            style={{
                                flex: 1, height: 22, borderRadius: 2,
                                background: cell ? errorToColor(cell.error) : 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.04)',
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
