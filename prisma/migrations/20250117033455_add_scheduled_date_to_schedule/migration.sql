-- First add scheduledDate as nullable
ALTER TABLE "Schedule" ADD COLUMN "scheduledDate" TIMESTAMP(3);

-- Update existing records to set scheduledDate based on time
UPDATE "Schedule"
SET "scheduledDate" = CURRENT_DATE + "time"::time;

-- Now drop the time column
ALTER TABLE "Schedule" DROP COLUMN "time";

-- Make scheduledDate required
ALTER TABLE "Schedule" ALTER COLUMN "scheduledDate" SET NOT NULL;
