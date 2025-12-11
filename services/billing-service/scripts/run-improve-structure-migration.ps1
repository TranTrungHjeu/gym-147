# PowerShell script to run improve database structure migration
# Usage: .\run-improve-structure-migration.ps1

param(
    [string]$DatabaseUrl = $env:DATABASE_URL,
    [string]$Host = "localhost",
    [string]$Port = "5432",
    [string]$Database = "",
    [string]$User = "",
    [string]$Password = ""
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Improve Database Structure Migration" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Parse DATABASE_URL if provided
if ($DatabaseUrl) {
    Write-Host "Parsing DATABASE_URL..." -ForegroundColor Yellow
    if ($DatabaseUrl -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)") {
        $User = $matches[1]
        $Password = $matches[2]
        $Host = $matches[3]
        $Port = $matches[4]
        $Database = $matches[5]
        Write-Host "Parsed connection details from DATABASE_URL" -ForegroundColor Green
    } else {
        Write-Host "Warning: Could not parse DATABASE_URL, using defaults" -ForegroundColor Yellow
    }
}

# Prompt for missing values
if (-not $Database) {
    $Database = Read-Host "Enter database name"
}

if (-not $User) {
    $User = Read-Host "Enter database user"
}

if (-not $Password) {
    $SecurePassword = Read-Host "Enter database password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$MigrationFile = Join-Path $ProjectRoot "prisma\migrations\improve_database_structure.sql"

if (-not (Test-Path $MigrationFile)) {
    Write-Host "Error: Migration file not found at $MigrationFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Migration Details:" -ForegroundColor Yellow
Write-Host "  Host: $Host" -ForegroundColor White
Write-Host "  Port: $Port" -ForegroundColor White
Write-Host "  Database: $Database" -ForegroundColor White
Write-Host "  User: $User" -ForegroundColor White
Write-Host "  Migration File: $MigrationFile" -ForegroundColor White
Write-Host ""

# Confirm before proceeding
$Confirm = Read-Host "Do you want to proceed with the migration? (yes/no)"
if ($Confirm -ne "yes") {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $Password

# Build psql command
$PsqlPath = "psql"
$ConnectionString = "-h $Host -p $Port -U $User -d $Database"

Write-Host ""
Write-Host "Running migration..." -ForegroundColor Yellow
Write-Host ""

try {
    # Read migration file and execute
    $MigrationContent = Get-Content $MigrationFile -Raw
    
    # Execute migration
    $MigrationContent | & $PsqlPath $ConnectionString
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "Migration completed successfully!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Verify constraints are working correctly" -ForegroundColor White
        Write-Host "  2. Test application functionality" -ForegroundColor White
        Write-Host "  3. Check application logs for any issues" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Red
        Write-Host "Migration failed!" -ForegroundColor Red
        Write-Host "============================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please check the error messages above." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "Error running migration: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""




