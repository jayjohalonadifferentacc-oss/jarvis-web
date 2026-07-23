@echo off
:: JARVIS LAN firewall helper.
:: Right-click this file -> "Run as administrator" (once per machine).
:: Opens TCP port 3210 inbound so your phone can reach JARVIS on the Wi-Fi.
:: Uses -Profile Private so it only applies on trusted networks.
:: Idempotent: it removes any prior JARVIS rule first, so re-running never
:: piles up duplicate rules.

set RULE=JARVIS LAN

:: Re-create the rule fresh (delete first, then add).
netsh advfirewall firewall delete rule name="%RULE%" >nul 2>&1
netsh advfirewall firewall add rule name="%RULE%" dir=in action=allow protocol=TCP localport=3210 profile=private
if errorlevel 1 (
  echo.
  echo FAILED to add the firewall rule.
  echo This script must run as Administrator:
  echo   right-click enable-lan.bat -> "Run as administrator"
  echo.
  echo Alternative (admin PowerShell):
  echo   New-NetFirewallRule -DisplayName "JARVIS LAN" -Direction Inbound -LocalPort 3210 -Protocol TCP -Action Allow -Profile Private
  pause
  exit /b 1
)

:: Confirm it actually landed.
netsh advfirewall firewall show rule name="%RULE%" >nul 2>&1
if errorlevel 1 (
  echo.
  echo Rule was added but could not be verified. Check Windows Firewall manually.
  pause
  exit /b 1
)

echo.
echo OK. Port 3210 is open for Private networks. Your phone can now connect.
echo (To close it later:  netsh advfirewall firewall delete rule name="JARVIS LAN")
pause
