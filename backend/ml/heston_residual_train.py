import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.ml.heston_dataset import Phase5HestonDataset
from backend.ml.cnn_pricer import ResidualSurfaceCNN

def train_heston_residual_model():
    """
    Trains the CNN architectue explicitly on Heston-generated ground truth residuals.
    Proves that the model structure generalizes away from static parametric skews 
    to complex correlation-driven PDEs.
    """
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Executing Phase 5 Training on device: {device}")
    
    # Generate smaller dataset since numerical integration is extremely slow
    dataset = Phase5HestonDataset(num_samples=200, grid_size=(16, 16))
    
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False)
    
    model = ResidualSurfaceCNN().to(device)
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.MSELoss()
    
    epochs = 20
    print("\nStarting Phase 5 Training: Correlation-Driven Heston Residuals")
    print("-" * 65)
    
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        
        for X_batch, Y_res_batch in train_loader:
            X_batch = X_batch.to(device)
            Y_res_batch = Y_res_batch.to(device)
            
            optimizer.zero_grad()
            preds = model(X_batch)
            loss = criterion(preds, Y_res_batch)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            
        model.eval()
        val_loss = 0.0
        
        with torch.no_grad():
            for X_batch, Y_res_batch in val_loader:
                X_batch = X_batch.to(device)
                Y_res_batch = Y_res_batch.to(device)
                
                preds = model(X_batch)
                val_loss += criterion(preds, Y_res_batch).item()
                
        t_l = train_loss/len(train_loader)
        v_l = val_loss/len(val_loader)
        print(f"Epoch [{epoch+1:02d}/{epochs}] | Train Loss: {t_l:.6f} | Val Loss: {v_l:.6f}")

    torch.save(model.state_dict(), "backend/ml/cnn_phase5_heston.pth")
    print("-" * 65)
    print("Training Complete. Phase 5 Heston model saved.")

if __name__ == "__main__":
    train_heston_residual_model()
