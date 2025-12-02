# Script hỗ trợ deploy Docker lên Railway
# Chạy từ root của project

Write-Host "🚀 Deploy Docker Containers lên Railway" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Checklist:" -ForegroundColor Yellow
Write-Host "1. Đã có Railway account và đã login" -ForegroundColor White
Write-Host "2. Đã có Supabase database connection string" -ForegroundColor White
Write-Host "3. Đã setup Redis (Railway hoặc external)" -ForegroundColor White
Write-Host "4. Đã connect GitHub repository với Railway" -ForegroundColor White
Write-Host ""

$continue = Read-Host "Đã hoàn thành checklist? (y/n)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "❌ Vui lòng hoàn thành checklist trước" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "📝 Các bước deploy trên Railway:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Tạo Project mới trên Railway" -ForegroundColor Yellow
Write-Host "2. Add Service cho mỗi backend service:" -ForegroundColor Yellow
Write-Host "   - Identity Service (services/identity-service)" -ForegroundColor Gray
Write-Host "   - Member Service (services/member-service)" -ForegroundColor Gray
Write-Host "   - Schedule Service (services/schedule-service)" -ForegroundColor Gray
Write-Host "   - Billing Service (services/billing-service)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Railway sẽ tự động detect Dockerfile" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Set Environment Variables cho mỗi service:" -ForegroundColor Yellow
Write-Host "   - DATABASE_URL (từ Supabase)" -ForegroundColor Gray
Write-Host "   - REDIS_URL" -ForegroundColor Gray
Write-Host "   - ALLOWED_ORIGINS" -ForegroundColor Gray
Write-Host "   - Inter-service URLs" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Deploy Frontend:" -ForegroundColor Yellow
Write-Host "   - Option 1: Static Site (khuyến nghị)" -ForegroundColor Gray
Write-Host "   - Option 2: Docker với Dockerfile.prod" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Xem hướng dẫn chi tiết tại: docs/DOCKER_DEPLOY.md" -ForegroundColor Cyan
Write-Host ""

