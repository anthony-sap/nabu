/*
  Warnings:

  - You are about to drop the column `existingUserTags` on the `TagSuggestionJob` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TagSuggestionJob" DROP COLUMN "existingUserTags";
