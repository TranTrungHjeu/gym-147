# Script hỗ trợ deploy web-admin lên Vercel
# Chạy từ root của project

Write-Host "🚀 Deploy Web Admin lên Vercel" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra Vercel CLI
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "⚠️  Vercel CLI chưa được cài đặt" -ForegroundColor Yellow
    Write-Host "Đang cài đặt Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Đã cài đặt Vercel CLI" -ForegroundColor Green
    Write-Host ""
}

# Chuyển đến thư mục web-admin
Push-Location apps/web-admin

Write-Host "📦 Đang deploy..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Lưu ý:" -ForegroundColor Yellow
Write-Host "1. Đảm bảo đã set Environment Variables trên Vercel Dashboard:" -ForegroundColor White
Write-Host "   - VITE_API_BASE_URL" -ForegroundColor Gray
Write-Host "   - VITE_WS_SCHEDULE_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Nếu lần đầu deploy, Vercel sẽ hỏi:" -ForegroundColor White
Write-Host "   - Set up and deploy? → Yes" -ForegroundColor Gray
Write-Host "   - Which scope? → Chọn account của bạn" -ForegroundColor Gray
Write-Host "   - Link to existing project? → No" -ForegroundColor Gray
Write-Host "   - Project name? → web-admin" -ForegroundColor Gray
Write-Host "   - Directory? → ./" -ForegroundColor Gray
Write-Host "   - Override settings? → No" -ForegroundColor Gray
Write-Host ""

# Hỏi xác nhận
$confirm = Read-Host "Bạn có muốn tiếp tục deploy? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "❌ Đã hủy deploy" -ForegroundColor Red
    Pop-Location
    exit
}

# Chạy Vercel deploy
Write-Host ""
Write-Host "🔄 Đang kết nối với Vercel..." -ForegroundColor Cyan
vercel

Pop-Location

Write-Host ""
Write-Host "✅ Hoàn tất!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Các bước tiếp theo:" -ForegroundColor Cyan
Write-Host "1. Kiểm tra Vercel Dashboard để xem deployment status" -ForegroundColor White
Write-Host "2. Thêm Environment Variables nếu chưa có:" -ForegroundColor White
Write-Host "   - VITE_API_BASE_URL" -ForegroundColor Gray
Write-Host "   - VITE_WS_SCHEDULE_URL" -ForegroundColor Gray
Write-Host "3. Đảm bảo backend services cho phép CORS từ Vercel domain" -ForegroundColor White
Write-Host ""



