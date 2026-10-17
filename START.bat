@echo off
title TradersBloc Server

echo.
echo ========================================
echo   TradersBloc - Starting Server...
echo ========================================
echo.

REM Install dependencies if needed
if not exist "server\node_modules\" (
    echo Installing dependencies...
    cd server
    call npm install
    cd ..
    echo.
)

REM Create .env if it doesn't exist
if not exist "server\.env" (
    echo Creating .env file...
    cd server
    copy .env.example .env
    node generate-secret.js
    echo.
    echo [!] IMPORTANT: Edit server\.env with your JWT secrets above
    pause
    cd ..
)

cd server
echo Starting server on http://localhost:3000
echo Press Ctrl+C to stop
echo.
call npm start
