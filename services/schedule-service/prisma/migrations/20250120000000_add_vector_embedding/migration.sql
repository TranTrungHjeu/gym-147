-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector embedding column to gym_classes table
ALTER TABLE "gym_classes" ADD COLUMN IF NOT EXISTS "class_embedding" vector(1536);

-- Create HNSW index for vector similarity search
CREATE INDEX IF NOT EXISTS "gym_classes_class_embedding_idx" 
ON "gym_classes" 
USING hnsw ("class_embedding" vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

