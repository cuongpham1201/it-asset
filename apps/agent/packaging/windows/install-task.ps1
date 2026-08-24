param(
    [string]$BinaryPath = "$env:ProgramFiles\AssetFlow\assetflow-agent.exe",
    [string]$ConfigPath = "$env:ProgramData\AssetFlow\agent.json"
)

$ErrorActionPreference = 'Stop'
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$action = New-ScheduledTaskAction -Execute $BinaryPath -Argument "once --config `"$ConfigPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 30)
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -StartWhenAvailable
Register-ScheduledTask -TaskName 'AssetFlow Inventory Agent' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force

