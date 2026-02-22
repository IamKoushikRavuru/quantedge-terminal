import numpy as np

def binomial_tree_price(S, K, T, r, sigma, option_type='call', exercise='european', steps=100):
    """
    Cox-Ross-Rubinstein (CRR) Binomial Tree option pricing model.
    Supports both European and American options.
    """
    if T <= 0:
        return max(S - K, 0.0) if option_type == 'call' else max(K - S, 0.0)

    dt = T / steps
    u = np.exp(sigma * np.sqrt(dt))
    d = 1.0 / u
    q = (np.exp(r * dt) - d) / (u - d)
    
    # Risk-neutral probability measure (handle edge cases)
    if q < 0 or q > 1:
        # Fallback to alternative tree or risk arbitrage warning, but keep CRR standard for now.
        pass 
        
    # Option values at maturity (leaves of the tree)
    asset_prices = S * (d ** np.arange(steps, -1, -1)) * (u ** np.arange(0, steps + 1, 1))
    
    if option_type == 'call':
        values = np.maximum(asset_prices - K, 0)
    else:
        values = np.maximum(K - asset_prices, 0)
        
    # Step backward through the tree
    discount = np.exp(-r * dt)
    
    for i in range(steps - 1, -1, -1):
        # Update asset prices for the current step (for American exercise early payoff check)
        if exercise == 'american':
            asset_prices = S * (d ** np.arange(i, -1, -1)) * (u ** np.arange(0, i + 1, 1))
            
        values = discount * (q * values[1:] + (1 - q) * values[:-1])
        
        if exercise == 'american':
            if option_type == 'call':
                values = np.maximum(values, asset_prices - K)
            else:
                values = np.maximum(values, K - asset_prices)
                
    return float(values[0])
