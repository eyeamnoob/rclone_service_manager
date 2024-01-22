$ErrorActionPreference = 'stop'
try {
    $rclone_path = $args[0]
    $rclone_log_file = $args[1]
    $rclone_config_file = $args[2]
    $rclone_endpoint = $args[3]
    $service_name = $args[4]

    Write-Output "rclone_path $($rclone_path)" >> C:\Users\ali\Desktop\log.txt
    Write-Output "rclone_log_file $($rclone_log_file)" >> C:\Users\ali\Desktop\log.txt
    Write-Output "rclone_config_file $($rclone_config_file)" >> C:\Users\ali\Desktop\log.txt
    Write-Output "rclone_endpoint $($rclone_endpoint)" >> C:\Users\ali\Desktop\log.txt
    Write-Output "service_name $($service_name)" >> C:\Users\ali\Desktop\log.txt


    $service = Get-Service -Name $($service_name) -ErrorAction SilentlyContinue
    
    if ($null -ne $service) {
        Write-Output "Service exists." >> c:\users\ali\desktop\log.txt
    }
    else {
        Write-Output "Service does not exist." >> c:\users\ali\desktop\log.txt
        Write-Output 'Creating Rclone service...' >> c:\users\ali\desktop\log.txt
        New-Service -Name $($service_name) -BinaryPathName "$($rclone_path) mount $($rclone_endpoint): X: --config $($rclone_config_file) --log-file $($rclone_log_file)"
        Write-Output 'Rclone service created.' >> c:\users\ali\desktop\log.txt
    }
    
    Start-Service -Name $($service_name)
    Write-Output 'Rclone service is running.' >> c:\users\ali\desktop\log.txt
    
    exit 0
}
catch {
    Write-Output "Can not create or start service." >> c:\users\ali\desktop\log.txt
    # sc.exe delete Rclone
    exit 1  
}