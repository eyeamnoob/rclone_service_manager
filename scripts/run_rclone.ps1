$ErrorActionPreference = "stop"

try {
    $service = Get-Service -Name Rclone -ErrorAction SilentlyContinue
    
    if ($null -ne $service) {
        Write-Host "Service exists."
    }
    else {
        Write-Host "Service does not exist."
        Write-Host 'Creating Rclone service...'
        New-Service -Name Rclone -BinaryPathName "$($args[0]) mount monster: X: --config C:\Users\ali\Downloads\rclone\rclone.conf --log-file C:\rclone\mount.txt"
        Write-Host 'Rclone service created.'
    }
    
    Start-Service Rclone
    Write-Host 'Rclone service is running'
    
    exit 0
}
catch {
    exit 1    
}