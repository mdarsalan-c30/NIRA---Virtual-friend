@echo off
echo Starting NIRA - Virtual Friends...

start cmd /k "title NIRA Backend && cd backend && npm run dev"
start cmd /k "title NIRA Frontend && cd frontend && npm run dev"

echo NIRA is launching in two separate windows.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
pause
