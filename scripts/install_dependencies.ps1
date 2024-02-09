
$ErrorActionPreference = 'stop'
try {
    Set-Location -Path c:/
    Start-BitsTransfer https://downloads.rclone.org/v1.63.1/rclone-v1.63.1-windows-amd64.zip
    Expand-Archive -LiteralPath c:\rclone-v1.63.1-windows-amd64.zip -DestinationPath c:\
    Rename-Item c:\rclone-v1.63.1-windows-amd64 c:\rclone
    
    Start-BitsTransfer https://github.com/winfsp/sshfs-win/releases/download/v3.5.20357/sshfs-win-3.5.20357-x64.msi
    Start-Process C:\sshfs-win-3.5.20357-x64.msi -ArgumentList "/quiet"
    
    Start-BitsTransfer https://github.com/winfsp/winfsp/releases/download/v1.10/winfsp-1.10.22006.msi
    Start-Process C:\winfsp-1.10.22006.msi -ArgumentList "/quiet"
    
    Start-Sleep 5
    
    Set-TimeZone -Id "Iran Standard Time"
    exit 0
}
catch {
    if (Test-Path -Path c:\rclone -PathType Container) {
        Remove-Item -Path c:\rclone -Recurse -Force
    }
    if (Test-Path -Path c:\sshfs-win-3.5.20357-x64.msi -PathType Leaf) {
        Remove-Item -Path c:\sshfs-win-3.5.20357-x64.msi -Force
    }
    if (Test-Path -Path C:\winfsp-1.10.22006.msi -PathType Leaf) {
        Remove-Item -Path C:\winfsp-1.10.22006.msi -Force
    }
    exit -1
}
