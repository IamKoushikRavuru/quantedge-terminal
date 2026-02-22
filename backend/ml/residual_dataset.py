import torch
from torch.utils.data import Dataset
import numpy as np
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.pricing.black_scholes import black_scholes_price

class Phase4Dataset(Dataset):
    """
    Synthetic dataset explicitly contrasting Residual formulation and Full-Price formulation.
    Generates option price surfaces (Strike x Maturity).
    Input X: [Normalized_BS, Moneyness (K/S), Time_to_Maturity] (3, N_K, N_T)
    Y_Res: [Residuals] (1, N_K, N_T) where Residuals = (Market - BS) / S
    Y_Full: [Prices] (1, N_K, N_T) where Prices = Market / S
    """
    def __init__(self, num_samples=1000, grid_size=(32, 32)):
        self.num_samples = num_samples
        self.grid_size = grid_size
        self.data_X, self.data_Y_res, self.data_Y_full = self._generate_dataset()
        
    def _generate_dataset(self):
        print("Generating Phase 4 Dataset (Full vs Residual)...")
        X_list = []
        Y_res_list = []
        Y_full_list = []
        
        # Fixed seed inside dataset generation for deterministic comparable testing
        np.random.seed(42)
        
        for _ in range(self.num_samples):
            S = float(np.random.uniform(90, 110))
            r = float(np.random.uniform(0.01, 0.05))
            sigma_base = float(np.random.uniform(0.1, 0.4))
            
            K_grid = np.linspace(S * 0.7, S * 1.3, self.grid_size[0])
            T_grid = np.linspace(0.05, 2.0, self.grid_size[1])
            
            K_mesh, T_mesh = np.meshgrid(K_grid, T_grid, indexing='ij')
            Moneyness = K_mesh / S
            
            # Base model: Black-Scholes
            BS_price_mesh = black_scholes_price(S, K_mesh, T_mesh, r, sigma_base, 'call')
            
            # Synthetic Market Model: 
            # Modifies implied volatility as a smooth function of Moneyness and Maturity
            vol_skew = sigma_base + 0.1 * (Moneyness - 1.0)**2 + 0.05 * np.exp(-T_mesh)
            Market_price_mesh = black_scholes_price(S, K_mesh, T_mesh, r, vol_skew, 'call')
            
            Residual_mesh = Market_price_mesh - BS_price_mesh
            
            # Input features matching the CNN
            X = np.stack([
                BS_price_mesh / S, 
                Moneyness,
                T_mesh
            ], axis=0)
            
            # Targets
            Y_res = np.expand_dims(Residual_mesh / S, axis=0)
            Y_full = np.expand_dims(Market_price_mesh / S, axis=0)
            
            X_list.append(torch.tensor(X, dtype=torch.float32))
            Y_res_list.append(torch.tensor(Y_res, dtype=torch.float32))
            Y_full_list.append(torch.tensor(Y_full, dtype=torch.float32))
            
        print("Dataset generated successfully.")
        return X_list, Y_res_list, Y_full_list

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        return self.data_X[idx], self.data_Y_res[idx], self.data_Y_full[idx]
