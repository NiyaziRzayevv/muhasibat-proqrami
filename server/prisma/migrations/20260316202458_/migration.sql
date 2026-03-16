-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "permissions" SET DEFAULT '{}'::jsonb;
