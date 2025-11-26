-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector embedding column to members table
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "profile_embedding" vector(1536);

-- Create HNSW index for vector similarity search
CREATE INDEX IF NOT EXISTS "members_profile_embedding_idx" 
ON "members" 
USING hnsw ("profile_embedding" vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

