-- AlterTable
ALTER TABLE "TagSuggestionJob" ADD COLUMN     "existingUserTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
