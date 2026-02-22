import numpy as np

def compute_metrics(true_prices, predicted_prices):
    """
    Computes global metrics between true target prices and CNN predicted prices.
    Returns MSE, MAE, and Max Absolute Error.
    """
    error = predicted_prices - true_prices
    abs_error = np.abs(error)
    
    return {
        'mse': np.mean(error**2),
        'mae': np.mean(abs_error),
        'max_err': np.max(abs_error)
    }

def compute_metrics_per_maturity(true_prices, predicted_prices, T_grid):
    """
    Computes metrics sliced discretely per maturity T.
    Assumes axis 1 corresponds to maturity.
    """
    metrics_per_T = {}
    error = predicted_prices - true_prices
    abs_error = np.abs(error)
    
    for i, t in enumerate(T_grid):
        metrics_per_T[t] = {
            'mse': np.mean(error[:, i]**2),
            'mae': np.mean(abs_error[:, i]),
            'max_err': np.max(abs_error[:, i])
        }
    return metrics_per_T
