import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.ml.residual_evaluate import load_phase4_comparisons

def plot_phase4_visualizations():
    S, K_grid, T_grid, BS_prices, Market_prices, CNN_res_prices, CNN_full_prices = load_phase4_comparisons()
    os.makedirs("experiments", exist_ok=True)
    
    # --- 1. Strike-Slice Price Comparisons ---
    # Select roughly 0.25, 0.5, 1.0 maturities
    target_maturities = [0.25, 0.5, 1.0]
    indices = [np.argmin(np.abs(T_grid - t)) for t in target_maturities]
    
    plt.figure(figsize=(18, 5))
    for idx, t_idx in enumerate(indices):
        plt.subplot(1, 3, idx+1)
        # Plot theoretical baseline
        plt.plot(K_grid, BS_prices[:, t_idx], label='Pure BS (Baseline)', linestyle='--', color='gray')
        # Plot target
        plt.plot(K_grid, Market_prices[:, t_idx], label='Target Market', color='blue', linewidth=4, alpha=0.3)
        # ML Models
        plt.plot(K_grid, CNN_full_prices[:, t_idx], label='Full-Price CNN', color='orange', linestyle='-.')
        plt.plot(K_grid, CNN_res_prices[:, t_idx], label='BS + Res CNN', color='red', linestyle=':')
        
        plt.title(f"Price vs Strike (Maturity T={T_grid[t_idx]:.2f})")
        plt.xlabel("Strike (K)")
        plt.ylabel("Option Price")
        plt.legend()
        plt.grid(True, alpha=0.3)
        
    plt.tight_layout()
    plt.savefig("experiments/phase4_slice_comparison.png", dpi=300)
    plt.close()

    # --- 2. Residual Error Heatmaps ---
    err_full = CNN_full_prices - Market_prices
    err_res = CNN_res_prices - Market_prices
    
    plt.figure(figsize=(18, 7))
    vmax = max(np.max(np.abs(err_full)), np.max(np.abs(err_res))) * 0.5 # Scale color bounds together
    
    # 2A. Full Price CNN Error
    plt.subplot(1, 2, 1)
    sns.heatmap(np.abs(err_full), xticklabels=np.round(T_grid, 2), yticklabels=np.round(K_grid, 0), cmap='Reds', vmax=vmax)
    plt.title("Absolute Error (Full-Price CNN)")
    plt.xlabel("Maturity (T)")
    plt.ylabel("Strike (K)")
    
    # 2B. Residual CNN Error
    plt.subplot(1, 2, 2)
    sns.heatmap(np.abs(err_res), xticklabels=np.round(T_grid, 2), yticklabels=np.round(K_grid, 0), cmap='Reds', vmax=vmax)
    plt.title("Absolute Error (BS + Residual CNN)")
    plt.xlabel("Maturity (T)")
    plt.ylabel("Strike (K)")
    
    plt.tight_layout()
    plt.savefig("experiments/phase4_error_heatmaps.png", dpi=300)
    plt.close()
    
    
    # --- 3. 3D Signed Residual Target Surface ---
    # Plot what the actual Target Residuals are, and what the CNN Res predicted
    True_Residual = Market_prices - BS_prices
    Pred_Residual = CNN_res_prices - BS_prices
    
    fig = plt.figure(figsize=(16, 7))
    ax1 = fig.add_subplot(121, projection='3d')
    T_mesh, K_mesh = np.meshgrid(T_grid, K_grid)
    
    surf1 = ax1.plot_surface(T_mesh, K_mesh, True_Residual, cmap='coolwarm', edgecolor='none')
    ax1.set_title("True Target Residual (Market - BS)")
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
    plt.savefig("experiments/phase4_signed_residuals.png", dpi=300)
    plt.close()

    print("Phase 4 visual outputs saved to 'experiments/' directory.")

if __name__ == "__main__":
    plot_phase4_visualizations()
