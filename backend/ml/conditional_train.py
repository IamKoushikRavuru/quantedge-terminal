import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.ml.conditional_dataset import Phase7ConditionalDataset
from backend.ml.conditional_residual_model import ConditionalResidualCNN

def train_conditional_residual_model():
    """
    Trains the Phase 7 Regime-Aware CNN on the EXACT same configuration 
    as the Phase 5 failure, but passing the conditional regime parameters.
    """
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Executing Phase 7 Training on device: {device}")
    
    # Same N=200 scale as Phase 5. No data magnification allowed.
    dataset = Phase7ConditionalDataset(num_samples=200, grid_size=(16, 16))
    
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False)
    
    # Using explicit conditioning channels
    model = ConditionalResidualCNN(spatial_channels=3, regime_channels=5, out_channels=1).to(device)
    optimizer = optim.Adam(model.parameters(), lr=0.001) # Same optimizer
    criterion = nn.MSELoss() # Same loss
    
    epochs = 20 # Same epochs
    print("\nStarting Phase 7 Training: Conditional Regime-Aware Model")
    print("-" * 65)
    
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        
        for X_spatial_batch, X_regime_batch, Y_res_batch in train_loader:
            X_spatial_batch = X_spatial_batch.to(device)
            X_regime_batch = X_regime_batch.to(device)
            Y_res_batch = Y_res_batch.to(device)
            
            optimizer.zero_grad()
            # Forward pass now receives spatial AND regime state
            preds = model(X_spatial_batch, X_regime_batch)
            loss = criterion(preds, Y_res_batch)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            
        model.eval()
        val_loss = 0.0
        
        with torch.no_grad():
            for X_spatial_batch, X_regime_batch, Y_res_batch in val_loader:
                X_spatial_batch = X_spatial_batch.to(device)
                X_regime_batch = X_regime_batch.to(device)
                Y_res_batch = Y_res_batch.to(device)
                
                preds = model(X_spatial_batch, X_regime_batch)
                val_loss += criterion(preds, Y_res_batch).item()
                
        t_l = train_loss/len(train_loader)
        v_l = val_loss/len(val_loader)
        print(f"Epoch [{epoch+1:02d}/{epochs}] | Train Loss: {t_l:.6f} | Val Loss: {v_l:.6f}")

    torch.save(model.state_dict(), "backend/ml/cnn_phase7_conditional.pth")
    print("-" * 65)
    print("Training Complete. Phase 7 Conditional model saved.")

if __name__ == "__main__":
    train_conditional_residual_model()
