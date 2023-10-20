$ErrorActionPreference = 'stop'
try {
    $name = $args[0]
    $command = $args[1]

    Write-Output "name: $($name)" >> c:\users\ali\desktop\output.txt
    Write-Output "command: $($command)" >> c:\users\ali\desktop\output.txt

    $service = Get-Service -Name "$($name)" -ErrorAction SilentlyContinue
    
    if ($null -ne $service) {
        Write-Output "Service exists."
    }
    else {
        Write-Output "Service does not exist."
        Write-Output "Creating $($name) service..."
        New-Service -Name "$($name)" -BinaryPathName "$($command)"
        Write-Output "$($name) service created."
    }

    exit 0
}
catch {
    Write-Output "Can not create $($name) service." >> c:\users\ali\desktop\output.txt
    exit 1
}