import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.ml.heston_evaluate import load_heston_test_slice

def plot_heston_visualizations():
    # Load heavily skewed (Correlation rho = -0.8) Heston surface to stress test CNN
    S, K_grid, T_grid, BS_prices, Heston_prices, CNN_prices = load_heston_test_slice(rho=-0.8)
    os.makedirs("experiments", exist_ok=True)
    
    # --- 1. Strike-Slice Price Comparisons ---
    target_maturities = [0.25, 0.5, 1.0]
    indices = [np.argmin(np.abs(T_grid - t)) for t in target_maturities]
    
    plt.figure(figsize=(18, 5))
    for idx, t_idx in enumerate(indices):
        plt.subplot(1, 3, idx+1)
        # Plot theoretical baseline
        plt.plot(K_grid, BS_prices[:, t_idx], label='Pure BS (ATM Baseline Vol)', linestyle='--', color='gray')
        # Plot stochastic target
        plt.plot(K_grid, Heston_prices[:, t_idx], label='Heston Market (Target)', color='blue', linewidth=4, alpha=0.3)
        # ML Models
        plt.plot(K_grid, CNN_prices[:, t_idx], label='BS + Residual CNN', color='red', linestyle=':')
        
        plt.title(f"Heston Price vs Strike (Maturity T={T_grid[t_idx]:.2f})")
        plt.xlabel("Strike (K)")
        plt.ylabel("Option Price")
        plt.legend()
        plt.grid(True, alpha=0.3)
        
    plt.tight_layout()
    plt.savefig("experiments/phase5_heston_slice_comparison.png", dpi=300)
    plt.close()

    # --- 2. Residual Error Heatmaps ---
    err_bs_only = BS_prices - Heston_prices
    err_cnn = CNN_prices - Heston_prices
    
    plt.figure(figsize=(18, 7))
    vmax = max(np.max(np.abs(err_bs_only)), np.max(np.abs(err_cnn)))
    
    # 2A. BS Error
    plt.subplot(1, 2, 1)
    sns.heatmap(np.abs(err_bs_only), xticklabels=np.round(T_grid, 2), yticklabels=np.round(K_grid, 0), cmap='Reds', vmax=vmax)
    plt.title("Absolute Error (Pure Black-Scholes)")
    plt.xlabel("Maturity (T)")
    plt.ylabel("Strike (K)")
    
    # 2B. CNN Error
    plt.subplot(1, 2, 2)
    sns.heatmap(np.abs(err_cnn), xticklabels=np.round(T_grid, 2), yticklabels=np.round(K_grid, 0), cmap='Reds', vmax=vmax)
    plt.title("Absolute Error (BS + Residual CNN)")
    plt.xlabel("Maturity (T)")
    plt.ylabel("Strike (K)")
    
    plt.tight_layout()
    plt.savefig("experiments/phase5_heston_error_heatmaps.png", dpi=300)
    plt.close()
    
    
    # --- 3. 3D Signed Residual Target Surface ---
    True_Residual = Heston_prices - BS_prices
    Pred_Residual = CNN_prices - BS_prices
    
    fig = plt.figure(figsize=(16, 7))
    ax1 = fig.add_subplot(121, projection='3d')
    T_mesh, K_mesh = np.meshgrid(T_grid, K_grid)
    
    surf1 = ax1.plot_surface(T_mesh, K_mesh, True_Residual, cmap='coolwarm', edgecolor='none')
    ax1.set_title("True Target Residual (Heston - BS)")
    ax1.set_xlabel("Maturity (T)")
    ax1.set_ylabel("Strike (K)")
    ax1.set_zlabel("Price Diff")
    
    ax2 = fig.add_subplot(122, projection='3d')
    surf2 = ax2.plot_surface(T_mesh, K_mesh, Pred_Residual, cmap='coolwarm', edgecolor='none')
    ax2.set_title("CNN Predicted Residual")
    ax2.set_xlabel("Maturity (T)")
    ax2.set_ylabel("Strike (K)")
    ax2.set_zlabel("Predicted Diff")
    
    plt.tight_layout()
    plt.savefig("experiments/phase5_heston_signed_residuals.png", dpi=300)
    plt.close()

    print("Phase 5 visual outputs saved to 'experiments/' directory.")

if __name__ == "__main__":
    plot_heston_visualizations()
