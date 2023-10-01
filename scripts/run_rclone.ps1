$ErrorActionPreference = 'stop'
try {
    $rclone_path = $args[0]
    $rclone_log_file = $args[1]
    $rclone_config_file = $args[2]


    $service = Get-Service -Name Rclone -ErrorAction SilentlyContinue
    
    if ($null -ne $service) {
        Write-Output "Service exists."
    }
    else {
        Write-Output "Service does not exist."
        Write-Output 'Creating Rclone service...'
        New-Service -Name Rclone -BinaryPathName "$($rclone_path) mount monster: X: --config $($rclone_config_file) --log-file $($rclone_log_file)"
        Write-Output 'Rclone service created.'
    }
    
    Start-Service Rclone
    Write-Output 'Rclone service is running.'
    
    exit 0
}
catch {
    Write-Output "Can not create or start service."
    # sc.exe delete Rclone
    exit 1  
}