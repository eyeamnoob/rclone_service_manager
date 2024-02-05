$ErrorActionPreference = 'stop'

try {
    $service_name = $args[0]
    $status = $args[1]

    Write-Output "service_name $($service_name)" >> C:\Users\ali\Desktop\log.txt
    Write-Output "status $($status)" >> C:\Users\ali\Desktop\log.txt

    $service = Get-Service -Name $($service_name) -ErrorAction SilentlyContinue
    
    if ($null -ne $service) {
        Write-Output "Service exists." >> C:\Users\ali\Desktop\log.txt
        
        if ($status -eq 'false') {
            Stop-Service -Name $($service_name)
            Write-Output "Rclone service Stopped." >> C:\Users\ali\Desktop\log.txt
        }
        elseif ($status -eq 'true') {
            Start-Service -Name $($service_name)
            Write-Output "Rclone service started." >> C:\Users\ali\Desktop\log.txt
        }
        else {
            Write-Output "unknown status." >> C:\Users\ali\Desktop\log.txt

            return 2
        }

        return 0
    }
    else {
        Write-Output "Service does not exist." >> C:\Users\ali\Desktop\log.txt

        return 1
    }
}
catch {
    Write-Output "can not stop service" >> C:\Users\ali\Desktop\log.txt
    Write-Output $_ >> C:\Users\ali\Desktop\log.txt

    return -1
}
