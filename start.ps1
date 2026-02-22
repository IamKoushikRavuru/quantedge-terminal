# QuantEdge Terminal — One-command launcher
# Run from the project root: .\start.ps1

$root = $PSScriptRoot

Write-Host ""
Write-Host "  ╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║   QuantEdge Terminal — Starting...   ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Backend ─────────────────────────────────────────────────────────────────
Write-Host "  [1/2] Starting FastAPI backend on http://localhost:8000" -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root'; .\venv\Scripts\Activate.ps1; uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload"
) -WindowStyle Normal

Start-Sleep -Seconds 2   # Give the backend a moment to bind

# ── Frontend ─────────────────────────────────────────────────────────────────
Write-Host "  [2/2] Starting Vite frontend on http://localhost:5173" -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root\frontend'; npm run dev"
) -WindowStyle Normal

Start-Sleep -Seconds 3   # Wait for Vite to start

# ── Open browser ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Opening http://localhost:5173 in your browser..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "  Backend  →  http://localhost:8000       (API)" -ForegroundColor Cyan
Write-Host "  Docs     →  http://localhost:8000/docs  (Swagger)" -ForegroundColor Cyan
Write-Host "  Frontend →  http://localhost:5173       (App)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Close the two terminal windows to stop the servers." -ForegroundColor DarkGray
Write-Host ""
