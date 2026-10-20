
CREATE TABLE "farm_saves" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_saves_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "farm_saves_userId_key"
ON "farm_saves"("userId");

ALTER TABLE "farm_saves"
ADD CONSTRAINT "farm_saves_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
