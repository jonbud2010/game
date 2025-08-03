-- CreateTable
CREATE TABLE "theme_rewards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lobby_id" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "executed_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "theme_rewards_lobby_id_fkey" FOREIGN KEY ("lobby_id") REFERENCES "lobbies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "theme_reward_winners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "theme_reward_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "coins_awarded" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "theme_reward_winners_theme_reward_id_fkey" FOREIGN KEY ("theme_reward_id") REFERENCES "theme_rewards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "theme_reward_winners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "theme_rewards_lobby_id_theme_week_year_key" ON "theme_rewards"("lobby_id", "theme", "week", "year");

-- CreateIndex
CREATE UNIQUE INDEX "theme_reward_winners_theme_reward_id_rank_key" ON "theme_reward_winners"("theme_reward_id", "rank");
