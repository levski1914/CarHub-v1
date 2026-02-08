-- CreateTable
CREATE TABLE "InboxNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "meta" JSONB,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboxNotification_dedupeKey_key" ON "InboxNotification"("dedupeKey");

-- CreateIndex
CREATE INDEX "InboxNotification_userId_createdAt_idx" ON "InboxNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InboxNotification_userId_readAt_idx" ON "InboxNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "InboxNotification_userId_deletedAt_idx" ON "InboxNotification"("userId", "deletedAt");

-- AddForeignKey
ALTER TABLE "InboxNotification" ADD CONSTRAINT "InboxNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
