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
            

            exit 2
        }

        exit 0
    }
    else {
        

        exit 1
    }
}
catch {
    
    

    exit -1
}
