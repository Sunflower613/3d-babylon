$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'FrpFrontend.Common.ps1')

$taskName = $script:FrpFrontendConfig.WatchdogTaskName
$scriptPath = Join-Path $PSScriptRoot 'Ensure-Frontend.ps1'
$command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

schtasks.exe /Create /TN $taskName /SC DAILY /ST 00:00 /RI 5 /DU 23:59 /TR $command /F | Out-Null

[pscustomobject]@{
    taskName   = $taskName
    scriptPath = $scriptPath
    schedule   = 'daily 00:00 repeating every 5 minutes for 23:59'
} | ConvertTo-Json -Depth 4
