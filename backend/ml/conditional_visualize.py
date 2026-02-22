import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.ml.conditional_evaluate import load_conditional_test_slice

def plot_conditional_visualizations():
    # Evaluate intense equity skew regime
    S, K_grid, T_grid, BS_prices, Heston_prices, CNN_uncond, CNN_cond = load_conditional_test_slice(rho=-0.8)
    os.makedirs("experiments", exist_ok=True)
    
    # --- 1. Strike-Slice Price Comparisons ---
    target_maturities = [0.25, 0.5, 1.0]
    indices = [np.argmin(np.abs(T_grid - t)) for t in target_maturities]
    
    plt.figure(figsize=(18, 5))
    for idx, t_idx in enumerate(indices):
        plt.subplot(1, 3, idx+1)
        plt.plot(K_grid, BS_prices[:, t_idx], label='Pure BS', linestyle='--', color='gray')
        plt.plot(K_grid, Heston_prices[:, t_idx], label='Target Heston', color='blue', linewidth=4, alpha=0.3)
        plt.plot(K_grid, CNN_uncond[:, t_idx], label='P5 Unconditional CNN', color='orange', linestyle='-.')
        plt.plot(K_grid, CNN_cond[:, t_idx], label='P7 Conditional CNN', color='red', linestyle=':')
        
        plt.title(f"Heston Extreme Skew T={T_grid[t_idx]:.2f} (rho=-0.8)")
        plt.xlabel("Strike (K)")
        plt.ylabel("Option Price")
        plt.legend()
        plt.grid(True, alpha=0.3)
        
    plt.tight_layout()
    plt.savefig("experiments/phase7_conditional_slice.png", dpi=300)
    plt.close()

    # --- 2. Residual Error Heatmaps ---
    err_bs = BS_prices - Heston_prices
    err_uncond = CNN_uncond - Heston_prices
    err_cond = CNN_cond - Heston_prices
    
    plt.figure(figsize=(24, 7))
    vmax = max(np.max(np.abs(err_bs)), np.max(np.abs(err_uncond)), np.max(np.abs(err_cond)))
    
    plt.subplot(1, 3, 1)
    sns.heatmap(np.abs(err_bs), xticklabels=np.round(T_grid, 2), yticklabels=np.round(K_grid, 0), cmap='Reds', vmax=vmax)
    plt.title("Error: Pure Black-Scholes")
    
    plt.subplot(1, 3, 2)
    sns.heatmap(np.abs(err_uncond), xticklabels=np.round(T_grid, 2), yticklabels=np.round(K_grid, 0), cmap='Reds', vmax=vmax)
    plt.title("Error: Phase 5 Unconditional CNN (Failed)")
    
    plt.subplot(1, 3, 3)
    sns.heatmap(np.abs(err_cond), xticklabels=np.round(T_grid, 2), yticklabels=np.round(K_grid, 0), cmap='Reds', vmax=vmax)
    plt.title("Error: Phase 7 Conditional CNN (Regime-Aware)")
    
    plt.tight_layout()
    plt.savefig("experiments/phase7_conditional_heatmaps.png", dpi=300)
    plt.close()
    
    print("Phase 7 visual outputs saved to 'experiments/' directory.")

if __name__ == "__main__":
    plot_conditional_visualizations()
