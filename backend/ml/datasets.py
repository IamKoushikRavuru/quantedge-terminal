import torch
from torch.utils.data import Dataset
import numpy as np
import sys
import os

# Add parent directory to path to allow importing from pricing
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.pricing.black_scholes import black_scholes_price

class OptionSurfaceDataset(Dataset):
    """
    Synthetic dataset for option pricing residuals.
    Generates option price surfaces (Strike x Maturity).
    Input X: [BS_Prices, Moneyness (K/S), Time_to_Maturity] as channels (3, N_K, N_T)
    Target Y: [Residuals] (1, N_K, N_T) where Residuals = Market_Price - BS_Price
    """
    def __init__(self, num_samples=1000, grid_size=(32, 32)):
        self.num_samples = num_samples
        self.grid_size = grid_size
        self.data_X, self.data_Y = self._generate_dataset()
        
    def _generate_dataset(self):
        print("Generating synthetic Option Surface Dataset...")
        X_list = []
        Y_list = []
        
        for _ in range(self.num_samples):
            # Random parameters
            S = float(np.random.uniform(90, 110))
            r = float(np.random.uniform(0.01, 0.05))
            sigma_base = float(np.random.uniform(0.1, 0.4))
            
            # Grid of strikes and maturities
            K_grid = np.linspace(S * 0.7, S * 1.3, self.grid_size[0])
            T_grid = np.linspace(0.05, 2.0, self.grid_size[1])
            
            K_mesh, T_mesh = np.meshgrid(K_grid, T_grid, indexing='ij')
            Moneyness = K_mesh / S
            
            # Compute Black-Scholes base prices
            # We vectorize across the mesh
            BS_price_mesh = black_scholes_price(S, K_mesh, T_mesh, r, sigma_base, 'call')
            
            # Simulate "Market" differences (e.g., volatility smile, skew, jump risk)
            # A simple synthetic skew function: K/S deviates from 1 => higher implied vol
            vol_skew = sigma_base + 0.1 * (Moneyness - 1.0)**2 + 0.05 * np.exp(-T_mesh)
            
            Market_price_mesh = black_scholes_price(S, K_mesh, T_mesh, r, vol_skew, 'call')
            
            Residuals = Market_price_mesh - BS_price_mesh
            
            # Pack input tensors: Shape (Channels=3, H=num_strikes, W=num_maturities)
            X = np.stack([
                BS_price_mesh / S, # Normalize prices by S
                Moneyness,
                T_mesh
            ], axis=0)
            
            Y = np.expand_dims(Residuals / S, axis=0) # Normalize residuals
            
            X_list.append(torch.tensor(X, dtype=torch.float32))
            Y_list.append(torch.tensor(Y, dtype=torch.float32))
            
        print("Dataset generated.")
        return X_list, Y_list

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        return self.data_X[idx], self.data_Y[idx]
