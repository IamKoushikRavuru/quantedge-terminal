import torch
import torch.nn as nn
import torch.nn.functional as F

class ResidualSurfaceCNN(nn.Module):
    """
    CNN architecture to learn the residual structure of option pricing errors 
    (Market - Black-Scholes) across the 2D spatial domain of (Strike, Maturity).
    
    Why CNN?
    Option surfaces have strong spatial coherence. The difference in price between
    a strike of 100 and 105 at maturity T is highly correlated. A CNN with local
    receptive fields over the KxT grid captures volatility smiles and term 
    structure skews perfectly.
    """
    def __init__(self, in_channels=3, out_channels=1):
        super(ResidualSurfaceCNN, self).__init__()
        
        # 3 channels: Normalized BS Price, Moneyness, Time to Maturity
        self.conv1 = nn.Conv2d(in_channels, 16, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(16)
        
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(32)
        
        self.conv3 = nn.Conv2d(32, 32, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(32)
        
        # Output is a 1-channel grid representing the Residual surface (Market - BS)
        self.conv_out = nn.Conv2d(32, out_channels, kernel_size=3, padding=1)

    def forward(self, x):
        """
        x: (Batch, Channels=3, K_grid_size, T_grid_size)
        returns: (Batch, Channels=1, K_grid_size, T_grid_size)
        """
        x = F.relu(self.bn1(self.conv1(x)))
        x = F.relu(self.bn2(self.conv2(x)))
        x = F.relu(self.bn3(self.conv3(x)))
        out = self.conv_out(x) # No activation at the end since residuals can be positive or negative
        return out
