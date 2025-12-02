-- 1) Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Verify extension is enabled
SELECT extname, nspname
FROM pg_extension
JOIN pg_namespace ON pg_extension.extnamespace = pg_namespace.oid
WHERE extname = 'vector';

-- 3) Set search_path to member_schema
SET search_path TO member_schema, public;

-- 4) Add vector embedding column to members table (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'member_schema' AND table_name = 'members'
  ) THEN
    -- Add column
    ALTER TABLE member_schema.members
      ADD COLUMN IF NOT EXISTS profile_embedding vector(1536);
    
    -- Create HNSW index for vector similarity search
    CREATE INDEX IF NOT EXISTS members_profile_embedding_idx 
    ON member_schema.members 
    USING hnsw (profile_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
    
    RAISE NOTICE 'Đã thêm cột profile_embedding và index vào bảng members';
  ELSE
    RAISE NOTICE 'Bảng member_schema.members không tồn tại — bỏ qua tạo cột profile_embedding';
  END IF;
END
$$;

