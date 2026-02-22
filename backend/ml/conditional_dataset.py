import torch
from torch.utils.data import Dataset
import numpy as np
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.pricing.black_scholes import black_scholes_price
from backend.models.heston_pricer import heston_price

class Phase7ConditionalDataset(Dataset):
    """
    Identical dataset to Phase 5, but additionally yields the latent regime parameters 
    (rho, nu, v0, kappa, theta) so the CNN can be conditionally explicitly aware of 
    the stochastic correlation regime.
    """
    def __init__(self, num_samples=200, grid_size=(16, 16), deterministic_seed=42):
        self.num_samples = num_samples
        self.grid_size = grid_size
        self.seed = deterministic_seed
        self.data_X, self.data_Regime, self.data_Y_res = self._generate_dataset()
        
    def _generate_dataset(self):
        print(f"Generating Phase 7 Conditional Heston Dataset (N={self.num_samples}).")
        
        X_list = []
        Regime_list = []
        Y_res_list = []
        
        np.random.seed(self.seed)
        
        for i in range(self.num_samples):
            if (i+1) % 50 == 0:
                print(f"  Generated {i+1}/{self.num_samples} surfaces...")
                
            S = 100.0  
            r = 0.05   
            
            v0 = float(np.random.uniform(0.01, 0.09))    
            theta = float(np.random.uniform(0.01, 0.09)) 
            kappa = float(np.random.uniform(1.0, 5.0))   
            nu = float(np.random.uniform(0.1, 0.5))      
            rho = float(np.random.uniform(-0.9, -0.1))   
            
            if 2 * kappa * theta <= nu**2:
                nu = np.sqrt(2 * kappa * theta) * 0.95
                
            K_grid = np.linspace(S * 0.8, S * 1.2, self.grid_size[0])
            T_grid = np.linspace(0.1, 2.0, self.grid_size[1])  
            
            K_mesh, T_mesh = np.meshgrid(K_grid, T_grid, indexing='ij')
            Moneyness = K_mesh / S
            
            # Ground Truth
            Heston_price_mesh = heston_price(S, K_mesh, T_mesh, r, kappa, theta, nu, rho, v0, 'call')
            
            # BS Baseline
            sigma_bl = np.sqrt(v0)
            BS_price_mesh = black_scholes_price(S, K_mesh, T_mesh, r, sigma_bl, 'call')
            
            # Target Residual
            Residual_mesh = Heston_price_mesh - BS_price_mesh
            
            X = np.stack([
                BS_price_mesh / S, 
                Moneyness,
                T_mesh
            ], axis=0)
            
            # The global regime parameters
            Regime = np.array([rho, nu, v0, kappa, theta], dtype=np.float32)
            
            Y_res = np.expand_dims(Residual_mesh / S, axis=0)
            
            X_list.append(torch.tensor(X, dtype=torch.float32))
            Regime_list.append(torch.tensor(Regime, dtype=torch.float32))
            Y_res_list.append(torch.tensor(Y_res, dtype=torch.float32))
            
        print("Conditional Data generation complete.")
        return X_list, Regime_list, Y_res_list

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        return self.data_X[idx], self.data_Regime[idx], self.data_Y_res[idx]
