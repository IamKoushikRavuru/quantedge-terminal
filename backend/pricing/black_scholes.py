import numpy as np
from scipy.stats import norm

def calculate_d1_d2(S, K, T, r, sigma):
    # Protect against divide by zero if sigma or T is extremely small
    sigma = np.maximum(sigma, 1e-8)
    T = np.maximum(T, 1e-8)
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    return d1, d2

def black_scholes_price(S, K, T, r, sigma, option_type='call'):
    """
    Calculate Black-Scholes theoretical option price.
    """
    # Force single values or arrays
    S, K, T, r, sigma = map(np.asarray, (S, K, T, r, sigma))
    
    # Edge case: zero time to maturity
    if np.any(T <= 0):
        if option_type == 'call':
            return np.where(T <= 0, np.maximum(S - K, 0.0), S)  # Simplified placeholder logic for vectorization
            
    d1, d2 = calculate_d1_d2(S, K, T, r, sigma)
    
    if option_type == 'call':
        price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
    elif option_type == 'put':
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
    else:
        raise ValueError("option_type must be 'call' or 'put'")
        
    # Handle near-zero T exactly
    price = np.where(T <= 1e-8, np.maximum(S - K, 0) if option_type == 'call' else np.maximum(K - S, 0), price)
    return float(price) if price.ndim == 0 else price

def black_scholes_greeks(S, K, T, r, sigma, option_type='call'):
    """
    Calculate Greeks analytically using Black-Scholes.
    """
    S, K, T, r, sigma = map(np.asarray, (S, K, T, r, sigma))
    
    d1, d2 = calculate_d1_d2(S, K, T, r, sigma)
    
    # Delta
    if option_type == 'call':
        delta = norm.cdf(d1)
    else:
        delta = norm.cdf(d1) - 1.0
        
    # Gamma
    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    
    # Theta (daily)
    term1 = -(S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T))
    if option_type == 'call':
        theta = (term1 - r * K * np.exp(-r * T) * norm.cdf(d2)) / 365.0
    else:
        theta = (term1 + r * K * np.exp(-r * T) * norm.cdf(-d2)) / 365.0
        
    # Vega (per 1% change)
    vega = S * norm.pdf(d1) * np.sqrt(T) / 100.0
    
    # Rho (per 1% change)
    if option_type == 'call':
        rho = K * T * np.exp(-r * T) * norm.cdf(d2) / 100.0
    else:
        rho = -K * T * np.exp(-r * T) * norm.cdf(-d2) / 100.0
        
    if S.ndim == 0:
        return {
            'delta': float(delta), 'gamma': float(gamma),
            'theta': float(theta), 'vega': float(vega), 'rho': float(rho)
        }
    return {'delta': delta, 'gamma': gamma, 'theta': theta, 'vega': vega, 'rho': rho}
