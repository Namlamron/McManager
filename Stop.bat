@echo off
echo Stopping McManager...
echo.
call pm2 stop all
echo.
echo Server stopped.
pause
