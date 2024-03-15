$ErrorActionPreference = 'stop'
try {
    $rclone_path = $args[0]
    $rclone_log_file = $args[1]
    $rclone_config_file = $args[2]
    $rclone_bucket = $args[3]
    $service_name = $args[4]
    $action = $args[5]

    if ($args.Length -gt 6) {
        $extra_args = $args[6..($args.Length - 1)]
    }
    else {
        $extra_args = "";
    }    

    $service = Get-Service -Name $($service_name) -ErrorAction SilentlyContinue
    
    if ($null -ne $service) {
        if ($action -eq "create") {
            exit 2
        }
        else {
            Stop-Service -Force -Name $($service_name)
            sc.exe delete $($service_name)
        }
    }
    
    if ($rclone_bucket -eq '__undefined__') {
        New-Service -Name $($service_name) -StartupType Manual -BinaryPathName "`"$($rclone_path)`" mount monster: * --config $($rclone_config_file) --log-file $($rclone_log_file) --volname $($service_name) $($extra_args)"
    }
    else {
        New-Service -Name $($service_name) -StartupType Manual -BinaryPathName "`"$($rclone_path)`" mount monster:$($rclone_bucket) * --config $($rclone_config_file) --log-file $($rclone_log_file) --volname $($service_name)_$($rclone_bucket) $($extra_args)"
    }
}
catch {
    exit 1
}
try {

    Start-Service -Name $($service_name)
    
    if ($action -eq "create") {
        exit 0
    }
    else {
        exit 4
    }
}
catch {
    if ($action -eq "create") {
        exit 3
    }
    else {
        exit 4
    }
}