# Seed all services
# Run from project root

Write-Host "🌱 Seeding all services..." -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{name="identity-service"; path="services/identity-service"},
    @{name="member-service"; path="services/member-service"},
    @{name="schedule-service"; path="services/schedule-service"},
    @{name="billing-service"; path="services/billing-service"}
)

foreach ($service in $services) {
    Write-Host "📦 Seeding $($service.name)..." -ForegroundColor Yellow
    
    Push-Location $service.path
    
    try {
        if (Test-Path "package.json") {
            $packageJson = Get-Content "package.json" | ConvertFrom-Json
            if ($packageJson.scripts.'prisma:seed') {
                npm run prisma:seed
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ $($service.name) seeded successfully!" -ForegroundColor Green
                } else {
                    Write-Host "⚠️  $($service.name) seed had issues" -ForegroundColor Yellow
                }
            } else {
                Write-Host "ℹ️  $($service.name) has no seed script" -ForegroundColor Gray
            }
        } else {
            Write-Host "⚠️  $($service.name) package.json not found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Error seeding $($service.name): $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
    
    Write-Host ""
}

Write-Host "✅ All services seeded!" -ForegroundColor Green



