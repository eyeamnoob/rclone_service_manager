$ErrorActionPreference = 'stop'
try {
    $service_name = $args[0]

    $service = Get-Service -Name $($service_name) -ErrorAction SilentlyContinue

    if ($null -ne $service) {
        sc.exe delete $($service_name) >> c:\users\ali\desktop\log.txt
        
        return 0
    }
    else {
        Write-Output "Service does not exist." >> c:\users\ali\desktop\log.txt

        return -1
    }
}
catch {
    Write-Output "Can not delete $($name) service." >> c:\users\ali\desktop\output.txt
    
    return 1
}