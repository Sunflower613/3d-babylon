$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'FrpFrontend.Common.ps1')

$status = Get-FrontendStatus

[pscustomobject]@{
    repoRoot        = $status.RepoRoot
    port            = $status.Port
    listenerPid     = if ($status.Listener) { $status.Listener.OwningProcess } else { $null }
    frontendProcess = $status.FrontendProcess
    localHealth     = $status.LocalHealth
    publicHealth    = $status.PublicHealth
    frpcProcesses   = $status.FrpcProcesses
    watchdogTask    = $status.WatchdogTaskName
} | ConvertTo-Json -Depth 6
