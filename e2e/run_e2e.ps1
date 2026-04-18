# run_e2e.ps1 — PowerShell equivalent of run_e2e.sh.
#
# Usage:
#   .\run_e2e.ps1
#   .\run_e2e.ps1 api/
#   .\run_e2e.ps1 -PytestArgs '-m','api'
#   $env:API_BASE_URL = 'http://127.0.0.1:8765'; .\run_e2e.ps1
#
# Assumes backend + frontend are already running (e.g. via start.bat).

[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PytestArgs
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$apiBase = if ($env:API_BASE_URL) { $env:API_BASE_URL } else { 'http://127.0.0.1:8000' }
$webBase = if ($env:WEB_BASE_URL) { $env:WEB_BASE_URL } else { 'http://localhost:3000' }

function Get-StatusCode {
    param([string]$Url)
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -Method Get
        return [int]$r.StatusCode
    } catch {
        if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
        return 0
    }
}

Write-Host "E2E runner"
Write-Host "  API: $apiBase"
Write-Host "  Web: $webBase"
Write-Host ""

$apiCode = Get-StatusCode "$apiBase/api/health"
if ($apiCode -ne 200) {
    Write-Host "Backend is not responding on $apiBase/api/health (got $apiCode)."
    Write-Host "Start it first: cd backend; uvicorn app.main:app --reload --port 8000"
    exit 2
}
Write-Host "  backend OK"

$webCode = Get-StatusCode $webBase
if ($webCode -eq 0 -or $webCode -ge 500) {
    Write-Host "  frontend unreachable (got $webCode) - running API tests only."
    if (-not $PytestArgs) { $PytestArgs = @('api/') }
} else {
    Write-Host "  frontend OK"
}

$env:API_BASE_URL = $apiBase
$env:WEB_BASE_URL = $webBase

Write-Host ""
if ($PytestArgs) {
    & pytest @PytestArgs
} else {
    & pytest
}
exit $LASTEXITCODE
