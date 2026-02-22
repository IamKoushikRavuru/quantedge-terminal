import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.ml.residual_dataset import Phase4Dataset
from backend.ml.cnn_pricer import ResidualSurfaceCNN

def train_phase4_models():
    """
    Trains two CNNs to rigorously prove efficiency of residual learning vs direct price learning.
    """
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Executing Phase 4 Training on device: {device}")
    
    dataset = Phase4Dataset(num_samples=1000)
    
    # Surface-level train/validation split
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
    
    # Instantiate identical architectures for controlled comparison
    model_res = ResidualSurfaceCNN().to(device)
    model_full = ResidualSurfaceCNN().to(device)
    
    optimizer_res = optim.Adam(model_res.parameters(), lr=0.001)
    optimizer_full = optim.Adam(model_full.parameters(), lr=0.001)
    criterion = nn.MSELoss()
    
    epochs = 20
    print("\nStarting Training: Full-Price CNN vs Residual-CNN")
    print("-" * 65)
    
    for epoch in range(epochs):
        model_res.train()
        model_full.train()
        
        train_loss_res = 0.0
        train_loss_full = 0.0
        
        for X_batch, Y_res_batch, Y_full_batch in train_loader:
            X_batch = X_batch.to(device)
            Y_res_batch = Y_res_batch.to(device)
            Y_full_batch = Y_full_batch.to(device)
            
            # 1. Train Residual Model
            optimizer_res.zero_grad()
            preds_res = model_res(X_batch)
            loss_res = criterion(preds_res, Y_res_batch)
            loss_res.backward()
            optimizer_res.step()
            train_loss_res += loss_res.item()
            
            # 2. Train Full Price Model
            optimizer_full.zero_grad()
            preds_full = model_full(X_batch)
            loss_full = criterion(preds_full, Y_full_batch)
            loss_full.backward()
            optimizer_full.step()
            train_loss_full += loss_full.item()
            
        # Validation
        model_res.eval()
        model_full.eval()
        val_loss_res = 0.0
        val_loss_full = 0.0
        
        with torch.no_grad():
            for X_batch, Y_res_batch, Y_full_batch in val_loader:
                X_batch = X_batch.to(device)
                Y_res_batch = Y_res_batch.to(device)
                Y_full_batch = Y_full_batch.to(device)
                
                preds_res = model_res(X_batch)
                val_loss_res += criterion(preds_res, Y_res_batch).item()
                
                preds_full = model_full(X_batch)
                val_loss_full += criterion(preds_full, Y_full_batch).item()
                
        # Logging
        t_res = train_loss_res/len(train_loader)
        v_res = val_loss_res/len(val_loader)
        t_full = train_loss_full/len(train_loader)
        v_full = val_loss_full/len(val_loader)
        
        print(f"Epoch [{epoch+1:02d}/{epochs}] | Res Val Loss: {v_res:.6f} | Full Val Loss: {v_full:.6f}")

    # Save models
    torch.save(model_res.state_dict(), "backend/ml/cnn_phase4_residual.pth")
    torch.save(model_full.state_dict(), "backend/ml/cnn_phase4_fullprice.pth")
    print("-" * 65)
    print("Training Complete. Phase 4 models saved.")

if __name__ == "__main__":
    train_phase4_models()
