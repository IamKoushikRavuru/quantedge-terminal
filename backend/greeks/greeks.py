from typing import Callable

def estimate_greeks_finite_difference(
    pricing_func: Callable, 
    S: float, K: float, T: float, r: float, sigma: float, 
    option_type: str = 'call', 
    dS: float = 0.01, dT: float = 1/365.0, dSigma: float = 0.001, dR: float = 0.0001,
    **kwargs
):
    """
    Numerically estimate Greeks using finite difference methods.
    Useful for models that do not have analytical Greeks (e.g. Binomial, complex Monte Carlo).
    """
    # Base price
    P = pricing_func(S, K, T, r, sigma, option_type, **kwargs)
    
    # Delta (Central Difference)
    P_up = pricing_func(S + dS, K, T, r, sigma, option_type, **kwargs)
    P_down = pricing_func(S - dS, K, T, r, sigma, option_type, **kwargs)
    delta = (P_up - P_down) / (2 * dS)
    
    # Gamma (Central Difference)
    gamma = (P_up - 2 * P + P_down) / (dS ** 2)
    
    # Theta (Forward Difference, options decay towards expiration so T decreases)
    # We step T down by dT
    if T > dT:
        P_t_down = pricing_func(S, K, T - dT, r, sigma, option_type, **kwargs)
        theta = (P_t_down - P) / (dT * 365.0)  # Daily theta approximation
    else:
        theta = 0.0
        
    # Vega (Forward Difference)
    P_sigma_up = pricing_func(S, K, T, r, sigma + dSigma, option_type, **kwargs)
    vega = (P_sigma_up - P) / (dSigma * 100.0) # Per 1% change
    
    # Rho (Forward Difference)
    P_r_up = pricing_func(S, K, T, r + dR, sigma, option_type, **kwargs)
    rho = (P_r_up - P) / (dR * 100.0) # Per 1% change
    
    return {
        'delta': delta,
        'gamma': gamma,
        'theta': theta,
        'vega': vega,
        'rho': rho
    }
