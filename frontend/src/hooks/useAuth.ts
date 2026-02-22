/**
 * useAuth — simple localStorage-based auth hook
 * Token stored as 'qe_token', user as 'qe_user'
 */
import { useState, useCallback } from 'react';

export interface QEUser {
    id: number;
    email: string;
    name: string;
    created_at: string;
}

interface AuthState {
    token: string | null;
    user: QEUser | null;
}

function load(): AuthState {
    try {
        return {
            token: localStorage.getItem('qe_token'),
            user: JSON.parse(localStorage.getItem('qe_user') ?? 'null'),
        };
    } catch { return { token: null, user: null }; }
}

export function useAuth() {
    const [state, setState] = useState<AuthState>(load);

    const saveAuth = useCallback((token: string, user: QEUser) => {
        localStorage.setItem('qe_token', token);
        localStorage.setItem('qe_user', JSON.stringify(user));
        setState({ token, user });
    }, []);

    const clearAuth = useCallback(() => {
        // Fire-and-forget logout on backend
        const token = localStorage.getItem('qe_token');
        if (token) {
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => { });
        }
        localStorage.removeItem('qe_token');
        localStorage.removeItem('qe_user');
        setState({ token: null, user: null });
    }, []);

    return {
        token: state.token,
        user: state.user,
        isLoggedIn: !!state.token,
        saveAuth,
        clearAuth,
    };
}

/** Standalone helpers (for non-hook contexts) */
export const getToken = () => localStorage.getItem('qe_token');
export const getUser = (): QEUser | null => {
    try { return JSON.parse(localStorage.getItem('qe_user') ?? 'null'); }
    catch { return null; }
};
