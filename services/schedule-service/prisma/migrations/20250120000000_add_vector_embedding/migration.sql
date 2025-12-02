-- 1) Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Verify extension is enabled
SELECT extname, nspname
FROM pg_extension
JOIN pg_namespace ON pg_extension.extnamespace = pg_namespace.oid
WHERE extname = 'vector';

-- 3) Set search_path to schedule_schema (like other services)
SET search_path TO schedule_schema, public;

-- 4) Add vector embedding column to gym_classes table (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'schedule_schema' AND table_name = 'gym_classes'
  ) THEN
    -- Add column
    ALTER TABLE schedule_schema.gym_classes
      ADD COLUMN IF NOT EXISTS class_embedding vector(1536);
    
    -- Create HNSW index for vector similarity search
    CREATE INDEX IF NOT EXISTS gym_classes_class_embedding_idx 
    ON schedule_schema.gym_classes 
    USING hnsw (class_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
    
    RAISE NOTICE 'Đã thêm cột class_embedding và index vào bảng gym_classes';
  ELSE
    RAISE NOTICE 'Bảng schedule_schema.gym_classes không tồn tại — bỏ qua tạo cột class_embedding';
  END IF;
END
$$;

