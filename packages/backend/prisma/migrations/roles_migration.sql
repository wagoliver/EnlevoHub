-- Migration: New Roles and Permissions System
-- This script converts old roles to new roles and adds new columns.
-- Run BEFORE prisma db push.

-- Step 1: Add new enum values to Role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ROOT';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ENGINEER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN_STAFF';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CONTRACTOR';

-- Step 2: Convert existing roles
UPDATE "users" SET "role" = 'ROOT' WHERE "role" = 'ADMIN';
UPDATE "users" SET "role" = 'ENGINEER' WHERE "role" = 'MANAGER';
-- VIEWER stays VIEWER

-- Step 3: Add new columns (if not exist)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "contractorId" TEXT;

-- Step 4: Add unique constraint on contractorId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_contractorId_key'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_contractorId_key" UNIQUE ("contractorId");
  END IF;
END $$;

-- Step 5: Add foreign key for contractor relation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_contractorId_fkey'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_contractorId_fkey"
      FOREIGN KEY ("contractorId") REFERENCES "contractors"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
