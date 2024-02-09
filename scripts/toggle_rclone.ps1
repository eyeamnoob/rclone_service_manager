$ErrorActionPreference = 'stop'

try {
    $service_name = $args[0]
    $status = $args[1]

    
    

    $service = Get-Service -Name $($service_name) -ErrorAction SilentlyContinue
    
    if ($null -ne $service) {
        
        
        if ($status -eq 'false') {
            Stop-Service -Name $($service_name)
            
        }
        elseif ($status -eq 'true') {
            Start-Service -Name $($service_name)
            
        }
        else {
            

            return 2
        }

        return 0
    }
    else {
        

        return 1
    }
}
catch {
    
    

    return -1
}
