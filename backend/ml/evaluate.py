import numpy as np
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.ml.metrics import compute_metrics, compute_metrics_per_maturity
from backend.ml.visualize import load_test_surface

def sanity_checks():
    """
    Rigorously tests the CNN output against fundamental option pricing no-arbitrage bounds.
    """
    print("=== Model Sanity & Arbitrage Checks ===")
    
    # 1. Monotonicity in Strike: Call option prices should never increase as Strike increases.
    S, K_grid, T_grid, BS, Market, CNN_prices = load_test_surface()
    
    strike_diffs = np.diff(CNN_prices, axis=0) # diff across strikes
    monotonicity_violations = np.sum(strike_diffs > 0)
    if monotonicity_violations > 0:
        print(f"[WARNING] Monotonicity violated! Models predicts increasing call value for higher strikes in {monotonicity_violations} grid points.")
    else:
        print("[OK] Strike Monotonicity: Call prices strictly decrease as Strike increases.")
        
    # 2. Volatility pricing pressure: Higher vol should produce higher prices.
    # Load a surface with baseline vol 0.20
    _, _, _, _, _, CNN_prices_low_vol = load_test_surface(sigma_base=0.20)
    # Load a surface with baseline vol 0.30
    _, _, _, _, _, CNN_prices_high_vol = load_test_surface(sigma_base=0.30)
    
    vol_diffs = CNN_prices_high_vol - CNN_prices_low_vol
    vega_violations = np.sum(vol_diffs < 0)
    if vega_violations > 0:
        print(f"[WARNING] Volatility logic violated in {vega_violations} grid points! Price dropped when vol increased.")
    else:
        print("[OK] Vega constraints: CNN prices increase monotonically with higher baseline volatility.")
        
    # 3. Very Short Maturity Payoff bounds: Check if T~0 respects intrinsic value roughly.
    # For T=0.01 (first index in T_grid)
    T_short_idx = 0
    CNN_short = CNN_prices[:, T_short_idx]
    Intrinsic = np.maximum(S - K_grid, 0)
    
    # At T=0.01, the option price shouldn't be drastically lower than intrinsic value
    intrinsic_violations = np.sum(CNN_short < Intrinsic - 0.05) # Allow 5 cents numerical tolerance
    if intrinsic_violations > 0:
        print(f"[WARNING] CNN prices fall violently below intrinsic payoff boundary at T->0 in {intrinsic_violations} points.")
    else:
        print("[OK] Small T Boundary: CNN prices respect intrinsic value bounds at near-expiration.")
    
    print("=======================================\n")

def run_quantitative_evaluation():
    S, K_grid, T_grid, BS_prices, Market_prices, CNN_prices = load_test_surface()
    
    print("=== Global CNN Pipeline Evaluation ===")
    global_metrics = compute_metrics(Market_prices, CNN_prices)
    print(f"Mean Squared Error (MSE):  {global_metrics['mse']:.6f}")
    print(f"Mean Absolute Error (MAE): {global_metrics['mae']:.6f}")
    print(f"Max Absolute Error:        {global_metrics['max_err']:.6f}\n")
    
    print("=== Quantitative Error Sliced By Maturity ===")
    metrics_per_t = compute_metrics_per_maturity(Market_prices, CNN_prices, T_grid)
    
    # We report for an early, middle, and late term to maturity
    for target_t in [0.05, 0.5, 1.0, 2.0]:
        t_idx = np.argmin(np.abs(T_grid - target_t))
        t_val = T_grid[t_idx]
        m = metrics_per_t[t_val]
        print(f"Maturity T={t_val:.2f} | MAE: {m['mae']:.5f} | Max Error: {m['max_err']:.5f} | MSE: {m['mse']:.6f}")
    print("=============================================\n")

if __name__ == "__main__":
    run_quantitative_evaluation()
    sanity_checks()
