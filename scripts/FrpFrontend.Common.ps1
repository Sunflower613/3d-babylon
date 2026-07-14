$script:FrpFrontendConfig = [ordered]@{
    RepoRoot         = (Split-Path -Parent $PSScriptRoot)
    Port             = 3000
    LocalUrl         = 'http://127.0.0.1:3000/blueprint3d-babylon/example/index.html'
    PublicUrl        = 'http://3000thvvtest.frp.pengyg.top/blueprint3d-babylon/example/index.html'
    NodeCommand      = 'node.exe'
    NodeArguments    = @((Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts\Serve-BlueprintStatic.mjs'))
    NpmCommand       = 'npm.cmd'
    BuildArguments   = @('--prefix', 'blueprint3d-babylon', 'run', 'build')
    OutputLog        = Join-Path (Split-Path -Parent $PSScriptRoot) '.codex-vite-3000.out.log'
    ErrorLog         = Join-Path (Split-Path -Parent $PSScriptRoot) '.codex-vite-3000.err.log'
    BuildOutputLog   = Join-Path (Split-Path -Parent $PSScriptRoot) '.codex-blueprint-build.out.log'
    BuildErrorLog    = Join-Path (Split-Path -Parent $PSScriptRoot) '.codex-blueprint-build.err.log'
    FrpcExe          = 'C:\Programs\frp\frpc.exe'
    FrpcConfig       = 'C:\Programs\frp\frpc.toml'
    WatchdogTaskName = '3d-babylon-frontend-watchdog'
}

function Invoke-HealthRequest {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [int]$TimeoutSec = 5
    )

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec
        [pscustomobject]@{
            Url        = $Url
            Ok         = $true
            StatusCode = [int]$response.StatusCode
            Error      = $null
        }
    } catch {
        $statusCode = $null
        if ($_.Exception.Response) {
            try {
                $statusCode = [int]$_.Exception.Response.StatusCode
            } catch {
                $statusCode = $null
            }
        }

        [pscustomobject]@{
            Url        = $Url
            Ok         = $false
            StatusCode = $statusCode
            Error      = $_.Exception.Message
        }
    }
}

function Get-FrontendListener {
    Get-NetTCPConnection -LocalPort $script:FrpFrontendConfig.Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

function Get-ProcessDetails {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ProcessId
    )

    $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    $wmi = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue

    [pscustomobject]@{
        Id          = $ProcessId
        Name        = $proc.ProcessName
        Path        = $proc.Path
        StartTime   = $proc.StartTime
        CommandLine = $wmi.CommandLine
    }
}

function Get-FrontendProcessDetails {
    $listener = Get-FrontendListener
    if (-not $listener) {
        return $null
    }

    Get-ProcessDetails -ProcessId $listener.OwningProcess
}

function Get-FrpcProcesses {
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq 'frpc.exe' } |
        Select-Object ProcessId, ExecutablePath, CommandLine
}

function Stop-FrontendProcess {
    $listener = Get-FrontendListener
    if (-not $listener) {
        return $false
    }

    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 750
    return $true
}

function Build-FrontendAssets {
    $process = Start-Process `
        -FilePath $script:FrpFrontendConfig.NpmCommand `
        -ArgumentList $script:FrpFrontendConfig.BuildArguments `
        -WorkingDirectory $script:FrpFrontendConfig.RepoRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $script:FrpFrontendConfig.BuildOutputLog `
        -RedirectStandardError $script:FrpFrontendConfig.BuildErrorLog `
        -PassThru `
        -Wait

    if ($process.ExitCode -ne 0) {
        throw "Blueprint static build failed with exit code $($process.ExitCode). See $($script:FrpFrontendConfig.BuildErrorLog)"
    }
}

function Start-FrontendProcess {
    Build-FrontendAssets
    Start-Process `
        -FilePath $script:FrpFrontendConfig.NodeCommand `
        -ArgumentList $script:FrpFrontendConfig.NodeArguments `
        -WorkingDirectory $script:FrpFrontendConfig.RepoRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $script:FrpFrontendConfig.OutputLog `
        -RedirectStandardError $script:FrpFrontendConfig.ErrorLog | Out-Null
}

function Wait-FrontendHealthy {
    param(
        [int]$TimeoutSec = 25
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    do {
        $health = Invoke-HealthRequest -Url $script:FrpFrontendConfig.LocalUrl -TimeoutSec 3
        if ($health.Ok) {
            return $health
        }

        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $deadline)

    return Invoke-HealthRequest -Url $script:FrpFrontendConfig.LocalUrl -TimeoutSec 3
}

function Ensure-FrpcRunning {
    $running = @(Get-FrpcProcesses)
    if ($running.Count -gt 0) {
        return [pscustomobject]@{
            Action    = 'already-running'
            Processes = $running
        }
    }

    if (-not (Test-Path $script:FrpFrontendConfig.FrpcExe) -or -not (Test-Path $script:FrpFrontendConfig.FrpcConfig)) {
        return [pscustomobject]@{
            Action    = 'missing-config'
            Processes = @()
        }
    }

    Start-Process `
        -FilePath $script:FrpFrontendConfig.FrpcExe `
        -ArgumentList @('-c', $script:FrpFrontendConfig.FrpcConfig) `
        -WorkingDirectory (Split-Path -Parent $script:FrpFrontendConfig.FrpcExe) `
        -WindowStyle Hidden | Out-Null

    Start-Sleep -Seconds 1

    [pscustomobject]@{
        Action    = 'started'
        Processes = @(Get-FrpcProcesses)
    }
}

function Restart-Frpc {
    $existing = @(Get-FrpcProcesses)
    foreach ($proc in $existing) {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Seconds 1
    Ensure-FrpcRunning
}

function Get-FrontendStatus {
    $listener = Get-FrontendListener
    $local = Invoke-HealthRequest -Url $script:FrpFrontendConfig.LocalUrl -TimeoutSec 5
    $public = Invoke-HealthRequest -Url $script:FrpFrontendConfig.PublicUrl -TimeoutSec 8
    $frpc = @(Get-FrpcProcesses)

    [pscustomobject]@{
        RepoRoot         = $script:FrpFrontendConfig.RepoRoot
        Port             = $script:FrpFrontendConfig.Port
        Listener         = $listener
        FrontendProcess  = if ($listener) { Get-ProcessDetails -ProcessId $listener.OwningProcess } else { $null }
        LocalHealth      = $local
        PublicHealth     = $public
        FrpcProcesses    = $frpc
        WatchdogTaskName = $script:FrpFrontendConfig.WatchdogTaskName
    }
}
