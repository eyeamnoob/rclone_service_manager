Write-Host 'Creating Rclone service...'

New-Service -Name Rclone -BinaryPathName 'C:\Users\ali\Downloads\rclone\rclone.exe mount monster: X: --config C:\Users\ali\Downloads\rclone\rclone.conf --log-file C:\Users\ali\Downloads\rclone\mount.txt'
Write-Host 'Rclone service created.'

Start-Service Rclone
Write-Host 'Rclone service is running'