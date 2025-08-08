-- CreateTable
CREATE TABLE "pack_formations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pack_id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    CONSTRAINT "pack_formations_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pack_formations_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_formations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "acquired_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_formations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_formations_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_formations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "positions" TEXT NOT NULL,
    "percentage" REAL NOT NULL DEFAULT 1.0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_formations" ("created_at", "id", "image_url", "name", "positions", "updated_at") SELECT "created_at", "id", "image_url", "name", "positions", "updated_at" FROM "formations";
DROP TABLE "formations";
ALTER TABLE "new_formations" RENAME TO "formations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "pack_formations_pack_id_formation_id_key" ON "pack_formations"("pack_id", "formation_id");
