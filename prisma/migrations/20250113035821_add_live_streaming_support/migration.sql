-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('RECORDED', 'LIVE');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "agoraChannelName" TEXT,
ADD COLUMN     "agoraToken" TEXT,
ADD COLUMN     "courseType" "CourseType" NOT NULL DEFAULT 'RECORDED',
ADD COLUMN     "isLiveActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextLiveDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LiveSessionRecording" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "muxAssetId" TEXT NOT NULL,
    "playbackId" TEXT,
    "title" TEXT NOT NULL,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSessionRecording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveSessionRecording_courseId_idx" ON "LiveSessionRecording"("courseId");

-- AddForeignKey
ALTER TABLE "LiveSessionRecording" ADD CONSTRAINT "LiveSessionRecording_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
