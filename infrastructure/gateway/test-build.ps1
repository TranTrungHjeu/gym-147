# Test script để build Docker image cho gateway
# Chạy script này từ thư mục infrastructure/gateway

Write-Host "=== Testing Gateway Dockerfile ===" -ForegroundColor Cyan

# Kiểm tra các file cần thiết
Write-Host "`nChecking required files..." -ForegroundColor Yellow
$files = @("Dockerfile", "entrypoint.sh", "nginx/nginx.conf.template")
$allExist = $true

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file NOT FOUND" -ForegroundColor Red
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Host "`nError: Some required files are missing!" -ForegroundColor Red
    exit 1
}

# Build Docker image
Write-Host "`nBuilding Docker image..." -ForegroundColor Yellow
$imageName = "gateway-test:latest"

try {
    docker build -t $imageName .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ Docker image built successfully!" -ForegroundColor Green
        Write-Host "  Image name: $imageName" -ForegroundColor Cyan
        
        # Test run với environment variables mẫu
        Write-Host "`nTo test the image, run:" -ForegroundColor Yellow
        Write-Host "  docker run -p 8080:80 -e PORT=80 -e IDENTITY_SERVICE_HOST=identity -e IDENTITY_SERVICE_PORT=3001 -e MEMBER_SERVICE_HOST=member -e MEMBER_SERVICE_PORT=3002 -e SCHEDULE_SERVICE_HOST=schedule -e SCHEDULE_SERVICE_PORT=3003 -e BILLING_SERVICE_HOST=billing -e BILLING_SERVICE_PORT=3004 $imageName" -ForegroundColor White
    } else {
        Write-Host "`n✗ Docker build failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n✗ Error building Docker image: $_" -ForegroundColor Red
    exit 1
}
