# QuantEdge Terminal 

**An Institutional-Grade Options & Derivatives Analytics Platform**

QuantEdge is a full-stack, real-time quantitative finance application built to simulate the complex analytical capabilities of a high-end trading desk. It focuses on the Indian derivatives market (NIFTY, BANKNIFTY, FINNIFTY) and provides interactive visualizations, volatility modeling, and risk constraints.

![Dashboard Preview](https://via.placeholder.com/800x450.png?text=QuantEdge+Dashboard)

## Features

- **Structural Market Analytics**: Live monitoring of Call/Put Open Interest (OI), Put-Call Ratios, Max Pain levels, and Gamma Exposure (GEX) profiles.
- **Interactive Volatility Surfaces**: 3D WebGL visualizations of Implied Volatility (IV) smiles and term structures, powered by Plotly.js.
- **Quantitative Signal Research**: 14 distinct mathematical signals spanning Volatility Structure, Positioning, Regime Classification, and Anomaly Detection.
- **Scenario Lab (Stress Testing)**: A dedicated engine to apply theoretical Spot Price & Volatility shocks, re-computing the full Option Chain pricing and Greeks (Δ, Γ, Θ, ν) using Black-Scholes dynamics.
- **Execution Sandbox**: A simulated order-entry module enforcing strict risk limits (|Δ| Cap, |ν| Cap, Notional Cap) and visualizing micro-slippage.
- **Proactive Context Guide**: A built-in AI tutorial system that senses which module the user is viewing and dynamically explains the financial mechanics underneath.

## Tech Stack

### Frontend
- **React 18** (Vite + TypeScript)
- **Vanilla CSS** (Custom Design System, Glassmorphism, 100% Mobile Responsive)
- **Plotly.js** (3D WebGL computation for Volatility Surfaces)
- **React Router** (Context-aware navigation)

### Backend
- **Python 3.10+ & FastAPI** (Async high-performance API)
- **Mathematical Engines**: Black-Scholes and Heston Pricing Models computed via `scipy` and `numpy`.
- **Data Layers**: SQLite (Profile Onboarding Database).

## Architecture Approach

QuantEdge was architected with a strict separation of concerns:
- **Stateless Mathematical Computation**: The backend operates as a pure stateless compute engine. Complex calculations (like generating the Greeks for a 50-strike option chain under a theoretical +5% spot shock) are handled entirely server-side in Python to leverage Numpy vectorization.
- **Client-Side Rendering**: The frontend handles complex rendering paths (like the Volatility `zMatrix` matrix transformations) to ensure the 3D surface rotations remain locked at 60fps in the browser without pinging the server.

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/IamKoushikRavuru/quantedge-terminal.git
cd quantedge-terminal

# 2. Start the Backend (FastAPI on port 8000)
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload

# 3. Start the Frontend (Vite on port 5173)
cd ../frontend
npm install
npm run dev
```

## Disclaimer
*This project is built strictly for software portfolio demonstration and educational purposes. The data generated is synthetic or delayed and the mathematical conclusions should not be used to execute live trades. QuantEdge is not an advisory service.*
