import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from .datasets import OptionSurfaceDataset
from .cnn_pricer import ResidualSurfaceCNN
import sys
import os

def train_model(epochs=20, batch_size=32, lr=0.001, save_path="backend/ml/cnn_model.pth"):
    # Clear definition of hardware device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training on device: {device}")
    
    # 1. Load Dataset
    print("Initializing dataset. This may take a minute...")
    dataset = OptionSurfaceDataset(num_samples=2000, grid_size=(32, 32))
    
    # Split train/val
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = random_split(dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    
    # 2. Model, Loss, Optimizer
    model = ResidualSurfaceCNN().to(device)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    # 3. Training Loop
    best_val_loss = float('inf')
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        for X, Y in train_loader:
            X, Y = X.to(device), Y.to(device)
            
            optimizer.zero_grad()
            outputs = model(X)
            loss = criterion(outputs, Y)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * X.size(0)
            
        train_loss /= len(train_loader.dataset)
        
        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for X, Y in val_loader:
                X, Y = X.to(device), Y.to(device)
                outputs = model(X)
                loss = criterion(outputs, Y)
                val_loss += loss.item() * X.size(0)
                
        val_loss /= len(val_loader.dataset)
        
        print(f"Epoch [{epoch+1}/{epochs}] | Train Loss: {train_loss:.6f} | Val Loss: {val_loss:.6f}")
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            # Create dir if not exists
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            torch.save(model.state_dict(), save_path)
            
    print(f"Training complete. Best validation loss: {best_val_loss:.6f}")
    print(f"Model saved to {save_path}")

if __name__ == "__main__":
    train_model()
