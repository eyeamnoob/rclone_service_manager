$service = Get-Service -Name Rclone -ErrorAction SilentlyContinue

if ($service) {
    echo "Service '$serviceName' exists." > output.txt
    return 0
}
else {
    echo "Service '$serviceName' does not exist." > output.txt
    return 1
}