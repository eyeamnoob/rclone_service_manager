Write-Host 'Stopping Rclone service...'

$service = Get-Service -Name Rclone -ErrorAction SilentlyContinue

if ($null -ne $service) {
    Write-Host "Service exists."
    Stop-Service Rclone
    Write-Host "Rclone service Stopped."
} else {
    Write-Host "Service does not exist."
}