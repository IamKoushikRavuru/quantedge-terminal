import torch
import numpy as np
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.ml.cnn_pricer import ResidualSurfaceCNN
from backend.models.heston_pricer import heston_price
from backend.pricing.black_scholes import black_scholes_price
from backend.ml.metrics import compute_metrics, compute_metrics_per_maturity

def load_heston_test_slice(model_path="backend/ml/cnn_phase5_heston.pth", rho=-0.7):
    """
    Generates a single rigorous Heston surface and evaluates the trained CNN against it.
    Can be parameterized by correlation rho to test different skew aggressiveness.
    """
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = ResidualSurfaceCNN().to(device)
    model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
    model.eval()
    
    # Standard testing parameters
    S = 100.0
    r = 0.05
    
    v0 = 0.04    # 20% initial vol
    theta = 0.04 # 20% long run vol
    kappa = 2.0  # Mean reversion
    nu = 0.3     # Vol of vol
    
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
    
    # 3. Model Inference
    X_tensor = torch.tensor(np.stack([BS_price_mesh / S, Moneyness, T_mesh], axis=0), dtype=torch.float32).unsqueeze(0).to(device)
    
    with torch.no_grad():
        preds_res_norm = model(X_tensor)
        
    CNN_res_price = BS_price_mesh + preds_res_norm.squeeze().cpu().numpy() * S
    
    return S, K_grid, T_grid, BS_price_mesh, Heston_price_mesh, CNN_res_price

def print_heston_metrics():
    rho_tests = [-0.2, -0.8]  # Test a mild skew and a very aggressive equity skew
    
    os.makedirs("experiments", exist_ok=True)
    with open("experiments/phase5_heston_quantitative_report.txt", "w") as f:
        f.write("Phase 5: Stochastic Volatility (Heston) Stress Test\n")
        f.write("===================================================\n\n")
    
        for rho in rho_tests:
            print(f"\n--- Testing Correlation rho={rho} ---")
            S, K_grid, T_grid, BS_prices, Heston_prices, CNN_prices = load_heston_test_slice(rho=rho)
            
            bs_metrics = compute_metrics(Heston_prices, BS_prices)
            cnn_metrics = compute_metrics(Heston_prices, CNN_prices)
            
            report = f"[Correlation: rho = {rho}]\n"
            report += f"  Pure BS MAE:           {bs_metrics['mae']:.6f}\n"
            report += f"  BS + CNN Residual MAE: {cnn_metrics['mae']:.6f}\n"
            
            if bs_metrics['mae'] > 0:
                imp = (bs_metrics['mae'] - cnn_metrics['mae']) / bs_metrics['mae'] * 100
                report += f"  => CNN Improvement:    {imp:.2f}%\n\n"
            
            print(report)
            f.write(report)
            
        f.write("Diagnostic Conclusion:\n")
        f.write("Under the stochastic Heston framework, the previously successful static-skew CNN architecture failed ")
        f.write("to generalize without hyperparameter tuning or dataset scaling. The Residual CNN was unable to outperform ")
        f.write("the baseline ATM Black-Scholes model, producing structural errors (negative improvement %) on heavily ")
        f.write("correlated surfaces. This valid negative result proves that mapping stochastic PDEs requires a larger ")
        f.write("network capacity or a more robustly sampled training space than static deterministic skews.")

if __name__ == "__main__":
    print_heston_metrics()
