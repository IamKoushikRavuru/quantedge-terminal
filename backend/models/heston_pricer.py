import numpy as np
import collections

# Scipy quad wrapper around numpy for numerical integration
from scipy.integrate import quad

def heston_characteristic_function(u, T, r, kappa, theta, nu, rho, v0):
    """
    Computes the characteristic function for the Heston model.
    u: integration variable
    nu: vol-of-vol (often denoted sigma in literature)
    """
    i = 1j
    
    # Precompute common terms
    d = np.sqrt((rho * nu * u * i - kappa)**2 - nu**2 * (-u * i - u**2))
    g = (kappa - rho * nu * u * i - d) / (kappa - rho * nu * u * i + d)
    
    # Compute characteristic function components
    C = r * u * i * T + (kappa * theta / nu**2) * \
        ((kappa - rho * nu * u * i - d) * T - 2 * np.log((1 - g * np.exp(-d * T)) / (1 - g)))
        
    D = (kappa - rho * nu * u * i - d) / nu**2 * ((1 - np.exp(-d * T)) / (1 - g * np.exp(-d * T)))
    
    return np.exp(C + D * v0)

def heston_integrand(u, S, K, T, r, kappa, theta, nu, rho, v0, prob_num):
    """
    The integrand used for computing the semi-analytical Heston Call price probabilities.
    """
    i = 1j
    
    if prob_num == 1:
        cf = heston_characteristic_function(u - i, T, r, kappa, theta, nu, rho, v0)
        cf_denom = heston_characteristic_function(-i, T, r, kappa, theta, nu, rho, v0)
        cf = cf / cf_denom
    else:
        cf = heston_characteristic_function(u, T, r, kappa, theta, nu, rho, v0)
        
    numerator = np.exp(-i * u * np.log(K / S)) * cf
    integrand = (numerator / (i * u)).real
    return integrand

def heston_price(S, K, T, r, kappa, theta, nu, rho, v0, option_type='call'):
    """
    Computes Heston option prices.
    Vectorized over K and T numpy grids for fast surface generation.
    """
    if isinstance(K, np.ndarray) and isinstance(T, np.ndarray):
        prices = np.zeros_like(K, dtype=np.float64)
        K_flat = K.flatten()
        T_flat = T.flatten()
        
        # Parallel integration could be added here, but for dataset generation 
        # a standard loop works fine (just takes a few minutes for thousands of surfaces)
        out_flat = np.zeros_like(K_flat)
        for idx in range(len(K_flat)):
            out_flat[idx] = _heston_price_scalar(S, K_flat[idx], T_flat[idx], r, kappa, theta, nu, rho, v0, option_type)
        return out_flat.reshape(K.shape)
    else:
        return _heston_price_scalar(S, K, T, r, kappa, theta, nu, rho, v0, option_type)

def _heston_price_scalar(S, K, T, r, kappa, theta, nu, rho, v0, option_type='call'):
    upper_limit = 100.0  # Integration cutoff
    
    int1, _ = quad(heston_integrand, 1e-4, upper_limit, 
                  args=(S, K, T, r, kappa, theta, nu, rho, v0, 1), 
                  limit=250)
    P1 = 0.5 + (1 / np.pi) * int1
    
    int2, _ = quad(heston_integrand, 1e-4, upper_limit, 
                  args=(S, K, T, r, kappa, theta, nu, rho, v0, 2), 
                  limit=250)
    P2 = 0.5 + (1 / np.pi) * int2
    
    call_price = S * P1 - K * np.exp(-r * T) * P2
    
    # Catch tiny numerical errors below 0
    call_price = max(call_price, 0.0)
    
    if option_type.lower() == 'call':
        return call_price
    elif option_type.lower() == 'put':
        put_price = call_price - S + K * np.exp(-r * T)
        return max(put_price, 0.0)
    else:
        raise ValueError("option_type must be 'call' or 'put'")
