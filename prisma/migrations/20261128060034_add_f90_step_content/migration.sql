-- CreateTable
CREATE TABLE "f90_step_content" (
    "stepKey" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "videoUrl" TEXT,
    "links" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "f90_step_content_pkey" PRIMARY KEY ("stepKey")
);
