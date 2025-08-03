import { Request, Response } from 'express';
import { prisma } from '../db/connection';
import { 
  calculateCurrentThemeStandings, 
  executeThemeRewards, 
  getThemeRewardHistory,
  getNextThemeRewardExecution
} from '../services/themeRewardService';
import type { 
  ExecuteThemeRewardsRequest,
  ExecuteThemeRewardsResponse,
  ThemeRewardsHistoryResponse,
  CurrentThemeStandingsResponse
} from '@football-tcg/shared';

/**
 * Get theme reward history for a lobby
 */
export const getThemeRewardsHistory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id: lobbyId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!lobbyId) {
      return res.status(400).json({
        success: false,
        error: 'Lobby ID is required'
      });
    }

    const result = await getThemeRewardHistory(lobbyId, page, limit);

    const response: ThemeRewardsHistoryResponse = {
      themeRewards: result.themeRewards,
      totalPages: result.totalPages,
      currentPage: result.currentPage
    };

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error getting theme rewards history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get theme rewards history'
    });
  }
};

/**
 * Get current theme standings for a lobby
 */
export const getCurrentThemeStandings = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id: lobbyId } = req.params;

    if (!lobbyId) {
      return res.status(400).json({
        success: false,
        error: 'Lobby ID is required'
      });
    }

    const standings = await calculateCurrentThemeStandings(lobbyId);
    const nextExecution = getNextThemeRewardExecution();

    const response: CurrentThemeStandingsResponse = {
      standings,
      nextExecution
    };

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error getting current theme standings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get current theme standings'
    });
  }
};

/**
 * Execute theme rewards manually (admin only)
 */
export const executeThemeRewardsManually = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id: lobbyId } = req.params;
    const { week, year }: ExecuteThemeRewardsRequest = req.body;

    if (!lobbyId) {
      return res.status(400).json({
        success: false,
        error: 'Lobby ID is required'
      });
    }

    // Check if user is admin of this lobby
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      select: { adminId: true }
    });

    if (!lobby) {
      return res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
    }

    if (lobby.adminId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Only lobby admins can manually execute theme rewards'
      });
    }

    const result = await executeThemeRewards(lobbyId, week, year);

    const response: ExecuteThemeRewardsResponse = {
      success: result.success,
      executedThemes: result.executedThemes,
      totalCoinsAwarded: result.totalCoinsAwarded,
      message: result.message
    };

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error executing theme rewards manually:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute theme rewards'
    });
  }
};

/**
 * Get user's theme reward earnings summary
 */
export const getUserThemeRewardSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id: lobbyId } = req.params;
    const userId = req.user!.id;

    if (!lobbyId) {
      return res.status(400).json({
        success: false,
        error: 'Lobby ID is required'
      });
    }

    // Get user's total earnings from theme rewards in this lobby
    const totalEarnings = await prisma.themeRewardWinner.aggregate({
      where: {
        userId,
        themeReward: {
          lobbyId
        }
      },
      _sum: {
        coinsAwarded: true
      },
      _count: {
        id: true
      }
    });

    // Get recent wins (last 4 weeks)
    const recentWins = await prisma.themeRewardWinner.findMany({
      where: {
        userId,
        themeReward: {
          lobbyId
        },
        coinsAwarded: {
          gt: 0
        }
      },
      include: {
        themeReward: true
      },
      orderBy: [
        { year: 'desc' },
        { week: 'desc' }
      ],
      take: 12 // Last 12 wins (up to 2 full weeks with 6 themes each)
    });

    // Get current standings
    const currentStandings = await calculateCurrentThemeStandings(lobbyId);
    const userCurrentStandings = currentStandings.map(themeStanding => {
      const userStanding = themeStanding.users.find(u => u.userId === userId);
      return {
        theme: themeStanding.theme,
        rank: userStanding?.rank || 4,
        points: userStanding?.highestPlayerPoints || 0,
        playerName: userStanding?.highestPlayerName || 'None',
        potentialReward: userStanding?.potentialReward || 0
      };
    });

    return res.json({
      success: true,
      data: {
        totalEarnings: totalEarnings._sum.coinsAwarded || 0,
        totalWins: totalEarnings._count || 0,
        recentWins: recentWins.map(win => ({
          theme: win.theme,
          rank: win.rank,
          points: win.points,
          coinsAwarded: win.coinsAwarded,
          week: win.week,
          year: win.year
        })),
        currentStandings: userCurrentStandings,
        nextExecution: getNextThemeRewardExecution()
      }
    });

  } catch (error) {
    console.error('Error getting user theme reward summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get theme reward summary'
    });
  }
};