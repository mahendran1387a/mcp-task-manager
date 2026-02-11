Add-Type -AssemblyName System.Windows.Forms
$global:balloon = New-Object System.Windows.Forms.NotifyIcon
$path = (Get-Process -id $pid).Path
$balloon.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
$balloon.BalloonTipIcon = "Info"
$balloon.BalloonTipText = "This is a test notification from PowerShell"
$balloon.BalloonTipTitle = "MCP Test"
$balloon.Visible = $true
$balloon.ShowBalloonTip(5000)
