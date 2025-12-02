# Migration: Add Backup, Webhook, API Key, and Template Models

This migration adds the following tables:
- `backups` - For backup and restore functionality
- `webhooks` - For webhook management
- `webhook_events` - For webhook event history
- `api_keys` - For API key management
- `email_templates` - For email template management
- `sms_templates` - For SMS template management

## To apply this migration:

### Option 1: Using Prisma (when database is accessible)
```bash
npx prisma migrate deploy
```

### Option 2: Manual SQL execution
If you cannot connect to the database via Prisma, you can run the SQL file directly:
```bash
psql -h aws-1-ap-southeast-2.pooler.supabase.com -U your_username -d postgres -f migration.sql
```

Or using connection string:
```bash
psql "postgresql://user:password@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres" -f migration.sql
```

## After migration:

1. Generate Prisma client:
```bash
npx prisma generate
```

2. Verify the migration:
```bash
npx prisma migrate status
```

