@echo off
echo Adding Windows Firewall rule for KKH Forecast (port 5555)...
netsh advfirewall firewall add rule name="KKH Forecast" dir=in action=allow protocol=TCP localport=5555
if %errorlevel% neq 0 (
    echo.
    echo ERROR: This script must be run as Administrator.
    echo Right-click this file and select "Run as administrator".
    pause
    exit /b 1
)
echo.
echo Firewall rule added successfully!
echo Other machines on your network can now access: http://%COMPUTERNAME%:5555
pause
