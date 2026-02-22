/**
 * QuantEdge Terminal — Domain Type Definitions
 */

export type PageId = 'dashboard' | 'option-chain' | 'vol-surface' | 'model-comparison' | 'ml-insights';

export type MarketSymbol = 'NIFTY' | 'BANKNIFTY' | 'FINNIFTY' | 'MIDCPNIFTY' | 'SENSEX';
export type MarketStatus = 'LIVE' | 'CLOSED' | 'PRE_OPEN' | 'POST_CLOSE';
export type SettlementType = 'CASH' | 'PHYSICAL';
export type ExpiryType = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
export type ModelType = 'BLACK_SCHOLES' | 'BINOMIAL' | 'MONTE_CARLO';
export type SurfaceType = 'SYNTHETIC' | 'MARKET';
export type OptionType = 'CE' | 'PE';
export type Trend = 'UP' | 'DOWN' | 'FLAT';
export type BadgeVariant = 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'muted';

export interface IndexSnapshot {
    symbol: MarketSymbol;
    ltp: number;
    change: number;
    changePct: number;
    atmIV: number;
    pcr: number;
    trend: Trend;
    sparklinePath: number[];
}

export interface MarketContext {
    riskFreeRate: number;
    settlementType: SettlementType;
    activeModel: ModelType;
    expiryCycle: ExpiryType;
    timeToExpiry: string;
    nextExpiryDate: string;
}

export interface IVPercentile {
    symbol: MarketSymbol;
    ivPct: number;
    iv30d: number;
    ivHvRatio: number;
}

export interface OIDistribution {
    totalCallOI: number;
    totalPutOI: number;
    maxPain: number;
    pcrOI: number;
    pcrVol: number;
    pcrChange: number;
    gammaFlip: number;
}

export interface FIIDIIFlow {
    fiiNet: number;
    diiNet: number;
    fiiFnOOI: number;
    date: string;
}

export interface MarketOverview {
    indices: IndexSnapshot[];
    context: MarketContext;
    ivPercentile: IVPercentile[];
    oiDist: OIDistribution;
    flows: FIIDIIFlow;
    vix: number;
    marketStatus: MarketStatus;
    dataTimestamp: string;
}

export interface Greeks {
    delta: number;
    gamma: number;
    vega: number;
    theta: number;
    rho: number;
}

export interface OptionLeg {
    type: OptionType;
    iv: number;
    ltp: number;
    bid: number;
    ask: number;
    oi: number;
    oiChange: number;
    volume: number;
    greeks: Greeks;
    delta: number;
}

export interface StrikeRow {
    strike: number;
    isATM: boolean;
    call: OptionLeg;
    put: OptionLeg;
}

export interface OptionChainMeta {
    symbol: MarketSymbol;
    expiry: string;
    underlyingPrice: number;
    atmStrike: number;
    totalCallOI: number;
    totalPutOI: number;
    pcr: number;
}

export interface OptionChainResponse {
    meta: OptionChainMeta;
    strikes: StrikeRow[];
}

export interface VolSurfacePoint {
    strike: number;
    expiry: string;
    iv: number;
    delta: number;
}

export interface SkewMetrics {
    rr25d: number;
    bf25d: number;
    rr10d: number;
    atmSkew: number;
    termStructure: 'NORMAL' | 'INVERTED' | 'FLAT';
}

export interface VolSurfaceResponse {
    symbol: MarketSymbol;
    surfaceType: SurfaceType;
    points: VolSurfacePoint[];
    skew: SkewMetrics;
    generatedAt: string;
}

export interface ModelMetrics {
    computationTime: number;
    accuracy: number;
    supportsAmerican: boolean;
    supportsStochVol: boolean;
    supportsExotics: boolean;
    complexity: 'O(1)' | 'O(n)' | 'O(n²)' | 'O(N)';
}

export interface ModelCard {
    id: ModelType;
    label: string;
    tagline: string;
    strengths: string[];
    weaknesses: string[];
    bestFor: string;
    metrics: ModelMetrics;
    isActive: boolean;
}

export interface ResidualCell {
    strikeIndex: number;
    expiryIndex: number;
    error: number;
    relativeError: number;
}

export interface MLModelMetrics {
    rmse: number;
    mae: number;
    r2: number;
    paramCount: number;
    trainEpochs: number;
    architecture: string;
}

export interface ResidualHeatmapResponse {
    cells: ResidualCell[];
    rows: number;
    cols: number;
    metrics: MLModelMetrics;
    disclaimer: string;
}

export interface WatchItem {
    label: string;
    value: number | string;
    trend?: Trend;
    unit?: string;
}

export interface ApiSuccess<T> {
    status: 'ok';
    data: T;
    ts: string;
}

export interface ApiError {
    status: 'error';
    code: number;
    message: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
