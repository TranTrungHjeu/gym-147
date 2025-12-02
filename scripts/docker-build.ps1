# Script build Docker images cho tất cả services
# Chạy từ root của project

Write-Host "🐳 Building Docker Images" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{name="identity-service"; path="services/identity-service"},
    @{name="member-service"; path="services/member-service"},
    @{name="schedule-service"; path="services/schedule-service"},
    @{name="billing-service"; path="services/billing-service"}
)

Write-Host "📦 Building backend services..." -ForegroundColor Yellow
foreach ($service in $services) {
    Write-Host ""
    Write-Host "Building $($service.name)..." -ForegroundColor Cyan
    Push-Location $service.path
    
    docker build -t gym-147/$($service.name):latest .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $($service.name) built successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to build $($service.name)" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
}

Write-Host ""
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
Push-Location apps/web-admin

docker build -f Dockerfile.prod -t gym-147/web-admin:latest .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ web-admin built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to build web-admin" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

Write-Host ""
Write-Host "✅ All images built successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Built images:" -ForegroundColor Cyan
docker images | Select-String "gym-147"

