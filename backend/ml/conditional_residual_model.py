import torch
import torch.nn as nn
import torch.nn.functional as F

class ConditionalResidualCNN(nn.Module):
    """
    Option B - Explicit Conditioning Channels
    
    Why Explicit Channels? 
    We broadcast the 5 global regime scalars (rho, nu, v0, kappa, theta) across 
    the entire 2D spatial grid (K, T) so they act as 5 constant feature maps.
    This preserves the spatial convolutions completely, explicitly allows the local 
    filters to immediately see and interact with the global correlation constraints 
    at every grid point, is mathematically highly interpretable, and prevents the 
    instability of deep FiLM bottlenecks on such a tiny dataset (N=200).
    """
    def __init__(self, spatial_channels=3, regime_channels=5, out_channels=1):
        super(ConditionalResidualCNN, self).__init__()
        
        total_in_channels = spatial_channels + regime_channels
        
        self.conv1 = nn.Conv2d(total_in_channels, 16, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(16)
        
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(32)
        
        self.conv3 = nn.Conv2d(32, 32, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(32)
        
        self.conv_out = nn.Conv2d(32, out_channels, kernel_size=3, padding=1)

    def forward(self, x_spatial, x_regime):
        """
        x_spatial: (Batch, 3, K, T) - [BS, Moneyness, Maturity]
        x_regime: (Batch, 5) - [rho, nu, v0, kappa, theta]
        """
        B, _, K, T = x_spatial.shape
        
        # Broadcast the scalar regime states to the 2D grid dimensions
        # Shape: (Batch, 5, K, T)
        x_regime_expanded = x_regime.view(B, 5, 1, 1).expand(B, 5, K, T)
        
        # Concatenate spatial and regime channels
        # Shape: (Batch, 8, K, T)
        x_combined = torch.cat([x_spatial, x_regime_expanded], dim=1)
        
        x = F.relu(self.bn1(self.conv1(x_combined)))
        x = F.relu(self.bn2(self.conv2(x)))
        x = F.relu(self.bn3(self.conv3(x)))
        out = self.conv_out(x)
        
        return out
