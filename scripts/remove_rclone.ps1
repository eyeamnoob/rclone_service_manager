$ErrorActionPreference = 'stop'
try {
    $service_name = $args[0]

    $service = Get-Service -Name $($service_name) -ErrorAction SilentlyContinue

    if ($null -ne $service) {
        Stop-Service -Name $($service_name)
        sc.exe delete $($service_name) 
        
        exit 0
    }
    else {
        exit 1
    }
}
catch {
    exit 2
}