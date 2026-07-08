param(
    [switch]$RestartFrpc
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'FrpFrontend.Common.ps1')

$stoppedFrontend = Stop-FrontendProcess
$frpcResult = if ($RestartFrpc) { Restart-Frpc } else { Ensure-FrpcRunning }

Start-FrontendProcess
$health = Wait-FrontendHealthy -TimeoutSec 25
$status = Get-FrontendStatus

[pscustomobject]@{
    stoppedFrontend = $stoppedFrontend
    frpcAction      = $frpcResult.Action
    localHealth     = $health
    finalStatus     = $status
} | ConvertTo-Json -Depth 6
