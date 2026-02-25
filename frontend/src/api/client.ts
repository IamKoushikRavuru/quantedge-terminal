/**
 * QuantEdge API Client — wired to real FastAPI backend
 * Function signatures are frozen. Only internals changed (mocks → real fetch).
 */

import type {
    ApiResponse,
    MarketOverview,
    OptionChainResponse,
    VolSurfaceResponse,
    ResidualHeatmapResponse,
    ModelCard,
    MarketSymbol,
} from '../types';

// ─── Config ──────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://quantedge-terminal.onrender.com';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        ...init,
    });
    if (!res.ok) {
        let msg = res.statusText;
        try { const e = await res.json(); msg = e.detail ?? e.message ?? msg; } catch { }
        throw new Error(msg);
    }
    const body: ApiResponse<T> = await res.json();
    if (body.status === 'error') throw new Error(body.message);
    return body.data;
}

// ─── Market Overview ─────────────────────────────────────────────────────────

export async function fetchMarketOverview(): Promise<MarketOverview> {
    return apiFetch<MarketOverview>('/api/market/overview');
}

// ─── Option Chain ─────────────────────────────────────────────────────────────

export async function fetchOptionChain(
    symbol: MarketSymbol,
    expiry: string,
): Promise<OptionChainResponse> {
    return apiFetch<OptionChainResponse>(`/api/chain/${symbol}/${expiry}`);
}

// ─── Volatility Surface ───────────────────────────────────────────────────────

export async function fetchVolSurface(
    symbol: MarketSymbol,
    _type: 'SYNTHETIC' | 'MARKET' = 'SYNTHETIC',
): Promise<VolSurfaceResponse> {
    return apiFetch<VolSurfaceResponse>(`/api/vol/surface/${symbol}?type=${_type}`);
}

// ─── ML Residual Heatmap ─────────────────────────────────────────────────────

export async function fetchResidualHeatmap(): Promise<ResidualHeatmapResponse> {
    return apiFetch<ResidualHeatmapResponse>('/api/ml/residuals');
}

// ─── Model Comparison ────────────────────────────────────────────────────────

export async function fetchModelComparison(): Promise<ModelCard[]> {
    return apiFetch<ModelCard[]>('/api/models/compare');
}
