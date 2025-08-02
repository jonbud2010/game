/*
  Warnings:

  - Added the required column `match_day` to the `league_table` table without a default value. This is not possible if the table is not empty.
  - Added the required column `admin_id` to the `lobbies` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "lobby_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lobby_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lobby_players_lobby_id_fkey" FOREIGN KEY ("lobby_id") REFERENCES "lobbies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lobby_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lobby_packs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lobby_id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lobby_packs_lobby_id_fkey" FOREIGN KEY ("lobby_id") REFERENCES "lobbies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lobby_packs_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lobby_formations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lobby_id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lobby_formations_lobby_id_fkey" FOREIGN KEY ("lobby_id") REFERENCES "lobbies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lobby_formations_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scheduled_match_days" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lobby_id" TEXT NOT NULL,
    "match_day" INTEGER NOT NULL,
    "scheduled_at" DATETIME NOT NULL,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "executed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scheduled_match_days_lobby_id_fkey" FOREIGN KEY ("lobby_id") REFERENCES "lobbies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_league_table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lobby_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "match_day" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "goals_for" INTEGER NOT NULL DEFAULT 0,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "league_table_lobby_id_fkey" FOREIGN KEY ("lobby_id") REFERENCES "lobbies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "league_table_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_league_table" ("draws", "goals_against", "goals_for", "id", "lobby_id", "losses", "points", "position", "user_id", "wins", "match_day") SELECT "draws", "goals_against", "goals_for", "id", "lobby_id", "losses", "points", "position", "user_id", "wins", 1 FROM "league_table";
DROP TABLE "league_table";
ALTER TABLE "new_league_table" RENAME TO "league_table";
CREATE UNIQUE INDEX "league_table_lobby_id_user_id_match_day_key" ON "league_table"("lobby_id", "user_id", "match_day");
CREATE TABLE "new_lobbies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "max_players" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "admin_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "current_match_day" INTEGER NOT NULL DEFAULT 1,
    "next_match_day" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "lobbies_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- First, update existing lobbies to assign the first member as admin
INSERT INTO "new_lobbies" ("created_at", "id", "max_players", "name", "status", "updated_at", "admin_id", "is_active", "current_match_day")
SELECT 
  l."created_at", 
  l."id", 
  l."max_players", 
  l."name", 
  l."status", 
  l."updated_at",
  COALESCE((
    SELECT lm."user_id" 
    FROM "lobby_members" lm 
    WHERE lm."lobby_id" = l."id" 
    ORDER BY lm."joined_at" ASC 
    LIMIT 1
  ), (SELECT u."id" FROM "users" u LIMIT 1)) as admin_id,
  true as is_active,
  1 as current_match_day
FROM "lobbies" l;
DROP TABLE "lobbies";
ALTER TABLE "new_lobbies" RENAME TO "lobbies";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "lobby_players_lobby_id_player_id_key" ON "lobby_players"("lobby_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "lobby_packs_lobby_id_pack_id_key" ON "lobby_packs"("lobby_id", "pack_id");

-- CreateIndex
CREATE UNIQUE INDEX "lobby_formations_lobby_id_formation_id_key" ON "lobby_formations"("lobby_id", "formation_id");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_match_days_lobby_id_match_day_key" ON "scheduled_match_days"("lobby_id", "match_day");
