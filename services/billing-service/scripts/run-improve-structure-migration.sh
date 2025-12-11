#!/bin/bash

# Shell script to run improve database structure migration
# Usage: ./run-improve-structure-migration.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}Improve Database Structure Migration${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATION_FILE="$PROJECT_ROOT/prisma/migrations/improve_database_structure.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found at $MIGRATION_FILE${NC}"
    exit 1
fi

# Parse DATABASE_URL if provided
if [ -n "$DATABASE_URL" ]; then
    echo -e "${YELLOW}Parsing DATABASE_URL...${NC}"
    # Parse postgresql://user:password@host:port/database
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
        echo -e "${GREEN}Parsed connection details from DATABASE_URL${NC}"
    else
        echo -e "${YELLOW}Warning: Could not parse DATABASE_URL, using defaults${NC}"
        DB_HOST="${DB_HOST:-localhost}"
        DB_PORT="${DB_PORT:-5432}"
        DB_NAME="${DB_NAME:-}"
        DB_USER="${DB_USER:-}"
        DB_PASSWORD="${DB_PASSWORD:-}"
    fi
else
    # Use environment variables or defaults
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-}"
    DB_USER="${DB_USER:-}"
    DB_PASSWORD="${DB_PASSWORD:-}"
fi

# Prompt for missing values
if [ -z "$DB_NAME" ]; then
    read -p "Enter database name: " DB_NAME
fi

if [ -z "$DB_USER" ]; then
    read -p "Enter database user: " DB_USER
fi

if [ -z "$DB_PASSWORD" ]; then
    read -s -p "Enter database password: " DB_PASSWORD
    echo ""
fi

echo ""
echo -e "${YELLOW}Migration Details:${NC}"
echo -e "  Host: ${DB_HOST}"
echo -e "  Port: ${DB_PORT}"
echo -e "  Database: ${DB_NAME}"
echo -e "  User: ${DB_USER}"
echo -e "  Migration File: ${MIGRATION_FILE}"
echo ""

# Confirm before proceeding
read -p "Do you want to proceed with the migration? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Migration cancelled.${NC}"
    exit 0
fi

# Set PGPASSWORD environment variable
export PGPASSWORD="$DB_PASSWORD"

echo ""
echo -e "${YELLOW}Running migration...${NC}"
echo ""

# Run migration
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}Migration completed successfully!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  1. Verify constraints are working correctly"
    echo -e "  2. Test application functionality"
    echo -e "  3. Check application logs for any issues"
else
    echo ""
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}Migration failed!${NC}"
    echo -e "${RED}============================================${NC}"
    echo ""
    echo -e "${YELLOW}Please check the error messages above.${NC}"
    exit 1
fi

# Clear password from environment
unset PGPASSWORD

echo ""




