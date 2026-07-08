$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'FrpFrontend.Common.ps1')

$frpcResult = Ensure-FrpcRunning
$existingHealth = Invoke-HealthRequest -Url $script:FrpFrontendConfig.LocalUrl -TimeoutSec 5

if (-not $existingHealth.Ok) {
    Stop-FrontendProcess | Out-Null
    Start-FrontendProcess
}

$health = Wait-FrontendHealthy -TimeoutSec 25
$status = Get-FrontendStatus

[pscustomobject]@{
    frpcAction   = $frpcResult.Action
    initialLocal = $existingHealth
    finalLocal   = $health
    finalStatus  = $status
} | ConvertTo-Json -Depth 6
