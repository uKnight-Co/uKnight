# Load .env and run the Spring Boot backend
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]*)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        Write-Host "Set $name"
    }
}

Write-Host "Starting Spring Boot backend with Neon DB..."
& .\mvnw.cmd spring-boot:run
