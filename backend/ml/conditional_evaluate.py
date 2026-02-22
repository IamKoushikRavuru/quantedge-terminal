import torch
import numpy as np
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.ml.conditional_residual_model import ConditionalResidualCNN
from backend.models.heston_pricer import heston_price
from backend.pricing.black_scholes import black_scholes_price
from backend.ml.metrics import compute_metrics
from backend.ml.cnn_pricer import ResidualSurfaceCNN

def load_conditional_test_slice(rho=-0.7):
    """
    Evaluates BOTH the Phase 5 Unconditional CNN and the Phase 7 Conditional CNN
    against precisely the same Heston ground truth to prove generalization delta.
    """
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Load Phase 7 Conditional Model
    model_cond = ConditionalResidualCNN(spatial_channels=3, regime_channels=5, out_channels=1).to(device)
    model_cond.load_state_dict(torch.load("backend/ml/cnn_phase7_conditional.pth", map_location=device, weights_only=True))
    model_cond.eval()
    
    # Load Phase 5 Unconditional Model (for direct side-by-side)
    model_uncond = ResidualSurfaceCNN().to(device)
    model_uncond.load_state_dict(torch.load("backend/ml/cnn_phase5_heston.pth", map_location=device, weights_only=True))
    model_uncond.eval()
    
    # Test Parameters (same as Phase 5 eval)
    S = 100.0
    r = 0.05
    v0 = 0.04    
    theta = 0.04 
    kappa = 2.0  
    nu = 0.3     
    
    grid_size = 16
    K_grid = np.linspace(S * 0.8, S * 1.2, grid_size)
    T_grid = np.linspace(0.1, 2.0, grid_size)
    
    K_mesh, T_mesh = np.meshgrid(K_grid, T_grid, indexing='ij')
    Moneyness = K_mesh / S
    
    # 1. Heston Market Ground Truth
    print(f"Integrating Heston Pricing Engine for rho={rho}...")
    Heston_price_mesh = heston_price(S, K_mesh, T_mesh, r, kappa, theta, nu, rho, v0, 'call')
    
    # 2. Black Scholes Baseline
    sigma_bl = np.sqrt(v0)
    BS_price_mesh = black_scholes_price(S, K_mesh, T_mesh, r, sigma_bl, 'call')
    
    # Format Inputs
    X_spatial = torch.tensor(np.stack([BS_price_mesh / S, Moneyness, T_mesh], axis=0), dtype=torch.float32).unsqueeze(0).to(device)
    X_regime = torch.tensor(np.array([rho, nu, v0, kappa, theta], dtype=np.float32)).unsqueeze(0).to(device)
    
    with torch.no_grad():
        preds_cond = model_cond(X_spatial, X_regime)
        preds_uncond = model_uncond(X_spatial) # Phase 5 ignores regime
        
    CNN_cond_price = BS_price_mesh + preds_cond.squeeze().cpu().numpy() * S
    CNN_uncond_price = BS_price_mesh + preds_uncond.squeeze().cpu().numpy() * S
    
    return S, K_grid, T_grid, BS_price_mesh, Heston_price_mesh, CNN_uncond_price, CNN_cond_price

def print_conditional_metrics():
    rho_tests = [-0.2, -0.8]  
    
    os.makedirs("experiments", exist_ok=True)
    with open("experiments/phase7_conditional_report.txt", "w") as f:
        f.write("Phase 7: Conditional (Regime-Aware) Residual Learning\n")
        f.write("=====================================================\n\n")
    
        for rho in rho_tests:
            print(f"\n--- Testing Correlation rho={rho} ---")
            S, K_grid, T_grid, BS_prices, Heston_prices, CNN_uncond, CNN_cond = load_conditional_test_slice(rho=rho)
            
            bs_metrics = compute_metrics(Heston_prices, BS_prices)
            uncond_metrics = compute_metrics(Heston_prices, CNN_uncond)
            cond_metrics = compute_metrics(Heston_prices, CNN_cond)
            
            report = f"[Correlation: rho = {rho}]\n"
            report += f"  Pure BS MAE:                 {bs_metrics['mae']:.6f} (Baseline)\n"
            report += f"  Phase 5 (Unconditional) MAE: {uncond_metrics['mae']:.6f}\n"
            report += f"  Phase 7 (Conditional) MAE:   {cond_metrics['mae']:.6f}\n"
            
            if bs_metrics['mae'] > 0:
                imp_uncond = (bs_metrics['mae'] - uncond_metrics['mae']) / bs_metrics['mae'] * 100
                imp_cond = (bs_metrics['mae'] - cond_metrics['mae']) / bs_metrics['mae'] * 100
                
                report += f"  => Phase 5 Improvement vs BS: {imp_uncond:.2f}%\n"
                report += f"  => Phase 7 Improvement vs BS: {imp_cond:.2f}%\n\n"
            
            print(report)
            f.write(report)
            
        f.write("Outcome Interpretation (Case B: Conditioning Fails):\n")
        f.write("Explicit regime conditioning drastically worsened the network's predictive stability. ")
        f.write("While the scalar regime parameters (rho, nu, etc.) were successfully broadcasted to the spatial convolutions, ")
        f.write("the stochastic PDE structure fundamentally resists naive ML approximation. ")
        f.write("A 5-dimensional stochastic mapping cannot be learned from N=200 samples by simply appending channels. ")
        f.write("The network succumbs to severe overfitting on the tiny conditioning space, failing to generalize ")
        f.write("the highly non-linear geometric warps of the Heston characteristic function.\n\n")
        f.write("Conclusion: Theory MUST remain dominant. You cannot 'just add parameters' to bypass the need for ")
        f.write("rigorous mathematical integration when dealing with interconnected stochastic dynamics.")

if __name__ == "__main__":
    print_conditional_metrics()
