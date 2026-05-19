-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assigneeIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
