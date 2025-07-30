-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 1000,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "lobbies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "max_players" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "lobby_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lobby_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lobby_members_lobby_id_fkey" FOREIGN KEY ("lobby_id") REFERENCES "lobbies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lobby_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "market_price" INTEGER NOT NULL,
    "theme" TEXT NOT NULL,
    "percentage" REAL NOT NULL DEFAULT 1.0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "formations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "positions" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "packs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pack_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pack_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    CONSTRAINT "pack_players_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pack_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "acquired_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "lobby_id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "match_day" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teams_lobby_id_fkey" FOREIGN KEY ("lobby_id") REFERENCES "lobbies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teams_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "team_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "team_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "team_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lobby_id" TEXT NOT NULL,
    "home_team_id" TEXT NOT NULL,
    "away_team_id" TEXT NOT NULL,
    "home_score" INTEGER NOT NULL DEFAULT 0,
    "away_score" INTEGER NOT NULL DEFAULT 0,
    "match_day" INTEGER NOT NULL,
    "played" BOOLEAN NOT NULL DEFAULT false,
    "played_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "matches_lobby_id_fkey" FOREIGN KEY ("lobby_id") REFERENCES "lobbies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "league_table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lobby_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lobby_members_lobby_id_user_id_key" ON "lobby_members"("lobby_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pack_players_pack_id_player_id_key" ON "pack_players"("pack_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_user_id_lobby_id_match_day_key" ON "teams"("user_id", "lobby_id", "match_day");

-- CreateIndex
CREATE UNIQUE INDEX "team_players_team_id_position_key" ON "team_players"("team_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "league_table_lobby_id_user_id_key" ON "league_table"("lobby_id", "user_id");
