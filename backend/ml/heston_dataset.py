import torch
from torch.utils.data import Dataset
import numpy as np
import sys
import os
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.pricing.black_scholes import black_scholes_price
from backend.models.heston_pricer import heston_price

class Phase5HestonDataset(Dataset):
    """
    Generates synthetic option price surfaces where Ground Truth = Stochastic Volatility (Heston).
    Target Residual = Heston_Price - Black_Scholes_Price
    """
    def __init__(self, num_samples=200, grid_size=(16, 16), deterministic_seed=42):
        self.num_samples = num_samples
        self.grid_size = grid_size
        self.seed = deterministic_seed
        self.data_X, self.data_Y_res = self._generate_dataset()
        
    def _generate_dataset(self):
        print(f"Generating Phase 5 Heston Dataset (N={self.num_samples}).")
        print("Note: Heston integration is mathematically intensive and may take 2-4 minutes...")
        
        start_time = time.time()
        X_list = []
        Y_res_list = []
        
        np.random.seed(self.seed)
        
        for i in range(self.num_samples):
            if (i+1) % 10 == 0:
                print(f"  Generated {i+1}/{self.num_samples} surfaces...")
                
            S = 100.0  # Fixed Spot
            r = 0.05   # Fixed Rate
            
            # Draw random Heston dynamics covering a broad spectrum of states
            v0 = float(np.random.uniform(0.01, 0.09))    # Initial var (10% to 30% vol)
            theta = float(np.random.uniform(0.01, 0.09)) # Long term var
            kappa = float(np.random.uniform(1.0, 5.0))   # Mean reversion speed
            nu = float(np.random.uniform(0.1, 0.5))      # Vol of Vol (sigma in some lit)
            
            # Correlation determines the skew shape. Usually negative in equities.
            rho = float(np.random.uniform(-0.9, -0.1))   
            
            # Feller condition violation catch (2*kappa*theta > nu^2)
            # Not strictly required for numerical CF, but good for process strictly > 0
            if 2 * kappa * theta <= nu**2:
                nu = np.sqrt(2 * kappa * theta) * 0.95
                
            K_grid = np.linspace(S * 0.8, S * 1.2, self.grid_size[0])
            T_grid = np.linspace(0.1, 2.0, self.grid_size[1])  # Keep away from T=0 kink for integration stability
            
            K_mesh, T_mesh = np.meshgrid(K_grid, T_grid, indexing='ij')
            Moneyness = K_mesh / S
            
            # 1. Heston Ground Truth Surface
            Heston_price_mesh = heston_price(S, K_mesh, T_mesh, r, kappa, theta, nu, rho, v0, 'call')
            
            # 2. Black-Scholes Baseline
            # We assume ATM Implied Volatility (approx sqrt(v0)) is used by the baseline theory
            sigma_bl = np.sqrt(v0)
            BS_price_mesh = black_scholes_price(S, K_mesh, T_mesh, r, sigma_bl, 'call')
            
            # 3. Target Residual
            Residual_mesh = Heston_price_mesh - BS_price_mesh
            
            # Pack input tensors: Shape (Channels=3, K, T)
            X = np.stack([
                BS_price_mesh / S, 
                Moneyness,
                T_mesh
            ], axis=0)
            
            Y_res = np.expand_dims(Residual_mesh / S, axis=0)
            
            # Append 
            X_list.append(torch.tensor(X, dtype=torch.float32))
            Y_res_list.append(torch.tensor(Y_res, dtype=torch.float32))
            
        print(f"Heston Data generation complete in {time.time()-start_time:.1f} sec.")
        return X_list, Y_res_list

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        return self.data_X[idx], self.data_Y_res[idx]
