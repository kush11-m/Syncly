-- Add optional avatar storage for user profile pictures
ALTER TABLE "User"
ADD COLUMN "avatarUrl" TEXT;
