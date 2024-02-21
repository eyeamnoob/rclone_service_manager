$ErrorActionPreference = 'stop'
try {
    $rclone_path = $args[0]
    $rclone_log_file = $args[1]
    $rclone_config_file = $args[2]
    $rclone_bucket = $args[3]
    $service_name = $args[4]

    if ($args.Length -gt 5) {
        $extra_args = $args[5..($args.Length - 1)]
    }
    else {
        $extra_args = "";
    }    

    $service = Get-Service -Name $($service_name) -ErrorAction SilentlyContinue
    
    if ($null -ne $service) {
        return -2
    }
    else {
        if ($rclone_bucket -eq '__undefined__') {
            New-Service -Name $($service_name) -StartupType Manual -BinaryPathName "$($rclone_path) mount monster: * --config $($rclone_config_file) --log-file $($rclone_log_file) $($extra_args)"
        }
        else {
            New-Service -Name $($service_name) -StartupType Manual -BinaryPathName "$($rclone_path) mount monster:$($rclone_bucket) * --config $($rclone_config_file) --log-file $($rclone_log_file) $($extra_args)"
        }
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
    return 1  
}