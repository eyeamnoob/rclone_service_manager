$ErrorActionPreference = 'stop'
try {
    $service_name = $args[0]

    $service = Get-Service -Name $($service_name) -ErrorAction SilentlyContinue

    if ($null -ne $service) {
        Stop-Service -Name $($service_name)
        sc.exe delete $($service_name) 
        
        return 0
    }
    else {
        

        return -1
    }
}
catch {
    
    
    return 1
}