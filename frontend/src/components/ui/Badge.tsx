import React from 'react';
import type { BadgeVariant } from '../../types';
import { BADGE_COLORS } from '../../design-system/tokens';

interface BadgeProps {
    variant: BadgeVariant;
    children: React.ReactNode;
}

export default function Badge({ variant, children }: BadgeProps) {
    const c = BADGE_COLORS[variant];
    return (
        <span style={{
            padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.05em', fontFamily: "'Space Mono',monospace",
            background: c.bg, color: c.color, border: `1px solid ${c.border}`,
        }}>
            {children}
        </span>
    );
}
