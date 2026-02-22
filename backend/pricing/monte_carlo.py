import torch

def monte_carlo_price(S, K, T, r, sigma, option_type='call', num_paths=100000, use_gpu=False):
    """
    Monte Carlo Option Pricing with PyTorch (GPU setup if available).
    Capable of handling extremely large simulations fast.
    """
    if T <= 0:
        return max(S - K, 0.0) if option_type == 'call' else max(K - S, 0.0)
        
    device = torch.device('cuda' if use_gpu and torch.cuda.is_available() else 'cpu')
    
    # Generate random paths (Vectorized)
    # W_T represents Brownian motion at maturity T
    Z = torch.randn(num_paths, device=device)
    
    # Terminal asset price under Geometric Brownian Motion
    S_T = S * torch.exp((r - 0.5 * sigma**2) * T + sigma * torch.sqrt(torch.tensor(T, dtype=torch.float32, device=device)) * Z)
    
    # Compute payoffs
    if option_type == 'call':
        payoffs = torch.clamp(S_T - K, min=0.0)
    elif option_type == 'put':
        payoffs = torch.clamp(K - S_T, min=0.0)
    else:
        raise ValueError("Invalid option_type")
        
    # Discount expected payoff
    price = torch.exp(torch.tensor(-r * T, dtype=torch.float32, device=device)) * torch.mean(payoffs)
    
    return float(price.cpu().numpy())
