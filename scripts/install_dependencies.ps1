
$ErrorActionPreference = 'stop'
try {
    $dependencies_path = $args[0]

    Start-Process -Wait "$($dependencies_path)\sshfs-win-3.5.20357-x64.msi"
    
    Start-Process -Wait "$($dependencies_path)\winfsp-1.10.22006.msi"
    
    Start-Sleep 5
    
    Set-TimeZone -Id "Iran Standard Time"
    exit 0
}
catch {
    exit -1
}
