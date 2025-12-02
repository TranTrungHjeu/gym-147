-- Migration: Move all schedule service tables to schedule_schema
-- To align with other services (identity_schema, member_schema, billing_schema)
-- This follows the same pattern as other services

-- 1. Create schedule_schema if not exists
CREATE SCHEMA IF NOT EXISTS schedule_schema;
GRANT ALL ON SCHEMA schedule_schema TO postgres;
GRANT USAGE ON SCHEMA schedule_schema TO postgres;

-- Set search_path to schedule_schema first
SET search_path TO schedule_schema, public;

-- 2. Di chuyển tất cả TABLES từ public sang schedule_schema
DO $$ 
DECLARE
    r RECORD;
    table_count INTEGER := 0;
BEGIN
    -- Di chuyển các bảng từ public sang schedule_schema
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'trainers', 'gym_classes', 'rooms', 'schedules', 'bookings', 
            'attendance', 'trainer_certifications', 'member_favorites', 
            'room_change_requests'
        )
    LOOP
        -- Check if table already exists in schedule_schema
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'schedule_schema' AND tablename = r.tablename
        ) THEN
            -- Di chuyển bảng sang schedule_schema
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA schedule_schema', r.tablename);
            RAISE NOTICE 'Moved table % from public to schedule_schema', r.tablename;
            table_count := table_count + 1;
        ELSE
            RAISE NOTICE 'Table % already exists in schedule_schema, skipping', r.tablename;
        END IF;
    END LOOP;
    
    IF table_count = 0 THEN
        RAISE NOTICE 'No tables found in public to move (they may already be in schedule_schema)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error moving tables: %', SQLERRM;
END $$;

-- 3. Di chuyển tất cả ENUM types từ public sang schedule_schema
DO $$ 
DECLARE
    r RECORD;
    enum_count INTEGER := 0;
BEGIN
    -- Di chuyển các enum types
    FOR r IN 
        SELECT typname 
        FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND t.typtype = 'e'
        AND typname IN (
            'TrainerStatus', 'ClassCategory', 'Difficulty', 'RoomStatus', 
            'ScheduleStatus', 'BookingStatus', 'AttendanceMethod', 
            'CertificationLevel', 'VerificationStatus', 'FavoriteType', 
            'RequestStatus', 'CheckInMethod', 'CheckOutMethod'
        )
    LOOP
        -- Check if enum already exists in schedule_schema
        IF NOT EXISTS (
            SELECT 1 FROM pg_type t2
            JOIN pg_namespace n2 ON t2.typnamespace = n2.oid
            WHERE n2.nspname = 'schedule_schema' AND t2.typname = r.typname
        ) THEN
            -- Di chuyển enum sang schedule_schema
            EXECUTE format('ALTER TYPE public.%I SET SCHEMA schedule_schema', r.typname);
            RAISE NOTICE 'Moved enum % from public to schedule_schema', r.typname;
            enum_count := enum_count + 1;
        ELSE
            RAISE NOTICE 'Enum % already exists in schedule_schema, skipping', r.typname;
        END IF;
    END LOOP;
    
    IF enum_count = 0 THEN
        RAISE NOTICE 'No enums found in public to move (they may already be in schedule_schema)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error moving enums: %', SQLERRM;
END $$;

-- 4. Di chuyển các FUNCTIONS từ public sang schedule_schema (nếu có)
DO $$ 
DECLARE
    r RECORD;
    func_count INTEGER := 0;
BEGIN
    FOR r IN 
        SELECT routine_name, routine_type
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name IN (
            'validate_rating', 'update_trainer_rating', 'update_trainer_total_classes'
        )
    LOOP
        -- Check if function already exists in schedule_schema
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'schedule_schema' AND routine_name = r.routine_name
        ) THEN
            EXECUTE format('ALTER FUNCTION public.%I() SET SCHEMA schedule_schema', r.routine_name);
            RAISE NOTICE 'Moved function % from public to schedule_schema', r.routine_name;
            func_count := func_count + 1;
        ELSE
            RAISE NOTICE 'Function % already exists in schedule_schema, skipping', r.routine_name;
        END IF;
    END LOOP;
    
    IF func_count = 0 THEN
        RAISE NOTICE 'No functions found in public to move (they may already be in schedule_schema)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error moving functions: %', SQLERRM;
END $$;

-- 5. Di chuyển _prisma_migrations table về schedule_schema (nếu đang ở public)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'schedule_schema' 
            AND table_name = '_prisma_migrations'
        ) THEN
            ALTER TABLE public._prisma_migrations SET SCHEMA schedule_schema;
            RAISE NOTICE 'Moved _prisma_migrations table from public to schedule_schema';
        ELSE
            RAISE NOTICE '_prisma_migrations already exists in schedule_schema, skipping';
        END IF;
    ELSE
        RAISE NOTICE '_prisma_migrations does not exist in public (may already be in schedule_schema)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Note: Could not move _prisma_migrations: %', SQLERRM;
END $$;

-- 6. Set search_path về schedule_schema (default)
SET search_path TO schedule_schema, public;

