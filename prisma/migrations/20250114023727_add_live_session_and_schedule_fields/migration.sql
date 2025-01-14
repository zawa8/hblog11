-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "speaker" TEXT,
ADD COLUMN     "startTime" TIMESTAMP(3),
ADD COLUMN     "topic" TEXT;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "maxParticipants" INTEGER;
