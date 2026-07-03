-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramChatId" TEXT;

-- CreateTable
CREATE TABLE "MilestoneComment" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MilestoneComment_milestoneId_idx" ON "MilestoneComment"("milestoneId");

-- AddForeignKey
ALTER TABLE "MilestoneComment" ADD CONSTRAINT "MilestoneComment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneComment" ADD CONSTRAINT "MilestoneComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
