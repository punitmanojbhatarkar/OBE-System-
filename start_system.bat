@echo off
echo ==============================================
echo    Starting AI OBE System
echo ==============================================

:: Start Backend (which also serves frontend files)
echo [1/1] Starting FastAPI Backend + Frontend...
cd backend
if exist venv\Scripts\python.exe (
    echo Using virtual environment...
    venv\Scripts\python.exe main.py
) else (
    echo Using system Python...
    python main.py
)

echo.
echo System is running!
echo Open http://localhost:8080 in your browser.
echo Press Ctrl+C to stop the server.
echo ==============================================
