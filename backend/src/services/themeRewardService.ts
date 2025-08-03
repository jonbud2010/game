import moment from 'moment-timezone';
import { prisma } from '../db/connection';
import { PLAYER_THEMES, THEME_REWARD_SETTINGS } from '@football-tcg/shared';
import type { PlayerTheme } from '@football-tcg/shared';

/**
 * Theme Reward Service for Weekly Theme-Based Rewards
 * Calculates and awards coins to users based on their highest-rated players per theme
 */

const BERLIN_TIMEZONE = 'Europe/Berlin';

interface UserThemeScore {
  userId: string;
  username: string;
  theme: PlayerTheme;
  highestPlayerPoints: number;
  highestPlayerName: string;
}

interface ThemeRanking {
  theme: PlayerTheme;
  rankings: Array<{
    userId: string;
    username: string;
    points: number;
    playerName: string;
    rank: number;
    coinsAwarded: number;
  }>;
}

/**
 * Calculate current theme standings for a lobby
 */
export const calculateCurrentThemeStandings = async (lobbyId: string) => {
  try {
    console.log(`🏆 Calculating current theme standings for lobby ${lobbyId}`);

    // Get all lobby members
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        members: {
          include: {
            user: {
              include: {
                userPlayers: {
                  include: {
                    player: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.members.length !== 4) {
      throw new Error('Theme rewards require exactly 4 lobby members');
    }

    const standings: Array<{
      theme: string;
      users: Array<{
        userId: string;
        username: string;
        highestPlayerPoints: number;
        highestPlayerName: string;
        rank: number;
        potentialReward: number;
      }>;
    }> = [];

    // Calculate standings for each theme
    for (const theme of PLAYER_THEMES) {
      const userScores: UserThemeScore[] = [];

      // For each lobby member, find their highest-rated player of this theme
      for (const member of lobby.members) {
        const userPlayers = member.user.userPlayers.filter(
          up => up.player.theme === theme
        );

        if (userPlayers.length === 0) {
          // User has no players of this theme - assign 0 points
          userScores.push({
            userId: member.userId,
            username: member.user.username,
            theme: theme as PlayerTheme,
            highestPlayerPoints: 0,
            highestPlayerName: 'None'
          });
        } else {
          // Find the highest-rated player
          const highestPlayer = userPlayers.reduce((highest, current) => 
            current.player.points > highest.player.points ? current : highest
          );

          userScores.push({
            userId: member.userId,
            username: member.user.username,
            theme: theme as PlayerTheme,
            highestPlayerPoints: highestPlayer.player.points,
            highestPlayerName: highestPlayer.player.name
          });
        }
      }

      // Sort by points (descending) and assign ranks
      userScores.sort((a, b) => b.highestPlayerPoints - a.highestPlayerPoints);
      
      const rankedUsers = userScores.map((user, index) => ({
        userId: user.userId,
        username: user.username,
        highestPlayerPoints: user.highestPlayerPoints,
        highestPlayerName: user.highestPlayerName,
        rank: index + 1,
        potentialReward: THEME_REWARD_SETTINGS.REWARDS[index + 1 as keyof typeof THEME_REWARD_SETTINGS.REWARDS] || 0
      }));

      standings.push({
        theme,
        users: rankedUsers
      });
    }

    return standings;
  } catch (error) {
    console.error(`❌ Error calculating theme standings for lobby ${lobbyId}:`, error);
    throw error;
  }
};

/**
 * Execute theme rewards for a specific lobby for the current week
 */
export const executeThemeRewards = async (lobbyId: string, week?: number, year?: number): Promise<{
  success: boolean;
  executedThemes: string[];
  totalCoinsAwarded: number;
  message: string;
}> => {
  try {
    const berlinTime = moment().tz(BERLIN_TIMEZONE);
    const targetWeek = week || berlinTime.week();
    const targetYear = year || berlinTime.year();

    console.log(`🎯 Executing theme rewards for lobby ${lobbyId}, week ${targetWeek}/${targetYear}`);

    // Check if rewards have already been executed for this week
    const existingRewards = await prisma.themeReward.findMany({
      where: {
        lobbyId,
        week: targetWeek,
        year: targetYear
      }
    });

    if (existingRewards.length > 0) {
      return {
        success: false,
        executedThemes: [],
        totalCoinsAwarded: 0,
        message: `Theme rewards for week ${targetWeek}/${targetYear} have already been executed`
      };
    }

    let totalCoinsAwarded = 0;
    const executedThemes: string[] = [];

    await prisma.$transaction(async (tx) => {
      // Calculate current theme standings
      const standings = await calculateCurrentThemeStandings(lobbyId);

      // Execute rewards for each theme
      for (const themeStanding of standings) {
        const theme = themeStanding.theme;
        
        // Create theme reward record
        const themeReward = await tx.themeReward.create({
          data: {
            lobbyId,
            theme,
            week: targetWeek,
            year: targetYear,
            executedAt: berlinTime.toDate()
          }
        });

        // Create winner records and award coins
        for (const user of themeStanding.users) {
          if (user.potentialReward > 0) {
            // Award coins to user
            await tx.user.update({
              where: { id: user.userId },
              data: {
                coins: {
                  increment: user.potentialReward
                }
              }
            });

            totalCoinsAwarded += user.potentialReward;
          }

          // Create winner record (even for 0 coins to maintain history)
          await tx.themeRewardWinner.create({
            data: {
              themeRewardId: themeReward.id,
              userId: user.userId,
              theme,
              rank: user.rank,
              points: user.highestPlayerPoints,
              coinsAwarded: user.potentialReward,
              week: targetWeek,
              year: targetYear
            }
          });
        }

        executedThemes.push(theme);
        console.log(`✅ Theme rewards executed for ${theme}: ${themeStanding.users.filter(u => u.potentialReward > 0).length} winners`);
      }
    });

    console.log(`🎉 Theme rewards execution completed for lobby ${lobbyId}. Total coins awarded: ${totalCoinsAwarded}`);

    return {
      success: true,
      executedThemes,
      totalCoinsAwarded,
      message: `Successfully executed theme rewards for week ${targetWeek}/${targetYear}. Awarded ${totalCoinsAwarded} coins across ${executedThemes.length} themes.`
    };

  } catch (error) {
    console.error(`❌ Error executing theme rewards for lobby ${lobbyId}:`, error);
    throw error;
  }
};

/**
 * Get theme reward history for a lobby with pagination
 */
export const getThemeRewardHistory = async (
  lobbyId: string, 
  page: number = 1, 
  limit: number = 10
) => {
  try {
    const offset = (page - 1) * limit;

    const themeRewards = await prisma.themeReward.findMany({
      where: { lobbyId },
      include: {
        winners: {
          include: {
            user: {
              select: {
                username: true
              }
            }
          },
          orderBy: {
            rank: 'asc'
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { week: 'desc' },
        { theme: 'asc' }
      ],
      take: limit,
      skip: offset
    });

    const totalRewards = await prisma.themeReward.count({
      where: { lobbyId }
    });

    const formattedRewards = themeRewards.map(reward => ({
      id: reward.id,
      theme: reward.theme,
      week: reward.week,
      year: reward.year,
      executedAt: reward.executedAt,
      winners: reward.winners.map(winner => ({
        id: winner.id,
        userId: winner.userId,
        username: winner.user.username,
        rank: winner.rank,
        points: winner.points,
        coinsAwarded: winner.coinsAwarded
      }))
    }));

    return {
      themeRewards: formattedRewards,
      totalPages: Math.ceil(totalRewards / limit),
      currentPage: page
    };

  } catch (error) {
    console.error(`❌ Error getting theme reward history for lobby ${lobbyId}:`, error);
    throw error;
  }
};

/**
 * Get the next scheduled theme reward execution time
 */
export const getNextThemeRewardExecution = (): Date => {
  const berlinTime = moment().tz(BERLIN_TIMEZONE);
  
  // Find next Sunday at 20:00 Berlin time
  let nextExecution = berlinTime.clone()
    .day(THEME_REWARD_SETTINGS.EXECUTION_DAY) // Sunday
    .hour(20)
    .minute(0)
    .second(0)
    .millisecond(0);

  // If we're past this Sunday's execution time, move to next Sunday
  if (nextExecution.isSameOrBefore(berlinTime)) {
    nextExecution = nextExecution.add(1, 'week');
  }

  return nextExecution.toDate();
};

/**
 * Execute theme rewards for all active lobbies (called by scheduler)
 */
export const executeThemeRewardsForAllLobbies = async (): Promise<void> => {
  try {
    console.log('🎯 Executing theme rewards for all active lobbies...');

    const activeLobbies = await prisma.lobby.findMany({
      where: {
        isActive: true
      },
      include: {
        members: true
      }
    });

    let totalLobbiesProcessed = 0;
    let totalCoinsAwarded = 0;

    for (const lobby of activeLobbies) {
      if (lobby.members.length === 4) {
        try {
          const result = await executeThemeRewards(lobby.id);
          if (result.success) {
            totalCoinsAwarded += result.totalCoinsAwarded;
            totalLobbiesProcessed++;
            console.log(`✅ Theme rewards executed for lobby "${lobby.name}": ${result.totalCoinsAwarded} coins awarded`);
          }
        } catch (error) {
          console.error(`❌ Error executing theme rewards for lobby "${lobby.name}":`, error);
        }
      } else {
        console.log(`⚠️ Skipping lobby "${lobby.name}": insufficient members (${lobby.members.length}/4)`);
      }
    }

    console.log(`🎉 Theme rewards execution completed for all lobbies. Processed ${totalLobbiesProcessed} lobbies, awarded ${totalCoinsAwarded} total coins.`);

  } catch (error) {
    console.error('❌ Error executing theme rewards for all lobbies:', error);
    throw error;
  }
};