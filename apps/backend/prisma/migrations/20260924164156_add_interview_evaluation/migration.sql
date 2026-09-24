-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "categories" JSONB,
ADD COLUMN     "improvements" JSONB,
ADD COLUMN     "strengths" JSONB,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "topics" JSONB;
