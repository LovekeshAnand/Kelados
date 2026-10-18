# Install or update Kelados on Windows:   irm https://kelados.in/install.ps1 | iex
# Downloads the latest release from GitHub, closes Kelados if it's running, installs for this user (no admin) and
# starts it. Your settings, snippets and history are kept.
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue" # the progress bar makes downloads 10x slower in Windows PowerShell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$url = "https://github.com/LovekeshAnand/Kelados/releases/latest/download/Kelados-Setup.exe"
$out = Join-Path $env:TEMP "Kelados-Setup.exe"

Write-Host "Downloading Kelados..."
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing

Get-Process -Name "Kelados" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

Write-Host "Installing..."
Start-Process -FilePath $out -ArgumentList "/S", "--force-run" -Wait
Remove-Item $out -ErrorAction SilentlyContinue
Write-Host "Done. Kelados is running in your system tray. Press Ctrl+Shift+Space in any app and talk."
