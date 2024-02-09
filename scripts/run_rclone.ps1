$ErrorActionPreference = 'stop'
try {
    $rclone_path = $args[0]
    $rclone_log_file = $args[1]
    $rclone_config_file = $args[2]
    $rclone_endpoint = $args[3]
    $service_name = $args[4]
    $extra_args = $args[5..($args.Length - 1)]

    
    
    
    
    
    
    

    $service = Get-Service -Name $($service_name) -ErrorAction SilentlyContinue
    
    if ($null -ne $service) {
        
        
        return -2
    }
    else {
        
        
        New-Service -Name $($service_name) -StartupType Manual -BinaryPathName "$($rclone_path) mount $($rclone_endpoint):* --config $($rclone_config_file) --log-file $($rclone_log_file) $($extra_args)"
        
    }
}
catch {
    
    

    return -1
}
try {

    Start-Service -Name $($service_name)
    
        
    return 0
}
catch {
    
    
    # sc.exe delete Rclone
    return 1  
}