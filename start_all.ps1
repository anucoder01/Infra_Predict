Write-Output "Starting InfraPredict Local Environment..."

# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\activate; uvicorn main:app --reload --host 0.0.0.0 --port 8001"

# Start Simulator (Wait for backend)
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd simulator; python main.py"

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Output "All services started! Access the dashboard at http://localhost:3000"
