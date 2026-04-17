# smoke_test.ps1 — quick health check for the newgen_realty backend (PowerShell).
#
# Usage:
#   .\smoke_test.ps1
#   .\smoke_test.ps1 -BaseUrl http://127.0.0.1:8765
#   $env:BASE_URL = "http://127.0.0.1:8765"; .\smoke_test.ps1
#
# Assumes the backend is already running. Exits non-zero if any critical
# endpoint fails. Compatible with Windows PowerShell 5.1 and PowerShell 7+.

[CmdletBinding()]
param(
    [string]$BaseUrl = $(if ($env:BASE_URL) { $env:BASE_URL } else { 'http://127.0.0.1:8000' })
)

$ErrorActionPreference = 'Stop'
$script:fail = 0

function Check {
    param(
        [string]$Path,
        [int]$Expected = 200
    )
    $url = "$BaseUrl$Path"
    $code = 0
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10 -Method Get
        $code = [int]$resp.StatusCode
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    } catch {
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    }

    $fmtPath = $Path.PadRight(40)
    if ($code -eq $Expected) {
        Write-Host ("  OK   {0} {1}" -f $fmtPath, $code)
    } else {
        Write-Host ("  FAIL {0} got {1}, expected {2}" -f $fmtPath, $code, $Expected)
        $script:fail = 1
    }
}

Write-Host "Smoke test against $BaseUrl"
Write-Host ""

Write-Host "Static + OpenAPI"
Check "/docs"
Check "/openapi.json"

Write-Host ""
Write-Host "Read-only list endpoints"
Check "/api/prospects?limit=3"
Check "/api/contacts?limit=3"
Check "/api/properties?limit=3"
Check "/api/activities?limit=3"
Check "/api/outreach/campaigns?limit=3"

Write-Host ""
Write-Host "Status / config endpoints (touch code paths edited in recent cleanup)"
Check "/api/prospects/status"
Check "/api/prospects/geo"

Write-Host ""
if ($script:fail -eq 0) {
    Write-Host "All checks passed."
    exit 0
} else {
    Write-Host "One or more checks failed."
    exit 1
}
