@echo off
title KKH Forecast Server
cd /d "%~dp0"
echo Starting KKH Forecast on port 5555...
npm run dev
pause
