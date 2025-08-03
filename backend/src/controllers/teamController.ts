import { Request, Response } from 'express';
import { prisma } from '../db/client';
import { calculateTeamChemistry, validateTeamChemistry, validateTeamPositions, PlayerPosition } from '@football-tcg/shared';
import { MATCH_SETTINGS } from '@football-tcg/shared';
import { validateUniquePlayersInMatchday, checkPlayerUsageInMatchday, getUsedPlayersInMatchday } from '../utils/teamValidation';
import { createDummyTeamPlayers } from '../utils/dummyPlayers';

/**
 * Team Controller
 * Handles CRUD operations for teams with formation validation and chemistry calculation
 */

// Get all teams for a user in a specific lobby
export const getUserTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lobbyId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const teams = await prisma.team.findMany({
      where: {
        userId,
        lobbyId
      },
      include: {
        formation: true,
        teamPlayers: {
          include: {
            player: true
          },
          orderBy: {
            position: 'asc'
          }
        }
      },
      orderBy: {
        matchDay: 'asc'
      }
    });

    res.json({
      success: true,
      data: teams,
      count: teams.length
    });
  } catch (error) {
    console.error('Error fetching user teams:', error);
    res.status(500).json({
      error: 'Failed to fetch teams',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get team by ID
export const getTeamById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const team = await prisma.team.findFirst({
      where: {
        id,
        userId // Ensure user can only access their own teams
      },
      include: {
        formation: true,
        teamPlayers: {
          include: {
            player: true
          },
          orderBy: {
            position: 'asc'
          }
        },
        user: {
          select: {
            id: true,
            username: true
          }
        },
        lobby: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    // Calculate team statistics
    const players = team.teamPlayers.map(tp => tp.player);
    const totalPoints = players.reduce((sum, player) => sum + player.points, 0);
    
    let chemistryPoints = 0;
    try {
      const playersWithColors = players.map(p => ({ color: p.color as any }));
      chemistryPoints = calculateTeamChemistry(team as any, playersWithColors);
    } catch (error) {
      // Chemistry validation failed, chemistry is 0
    }

    res.json({
      success: true,
      data: {
        ...team,
        stats: {
          totalPoints,
          chemistryPoints,
          totalStrength: totalPoints + chemistryPoints
        }
      }
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({
      error: 'Failed to fetch team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new team
export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lobbyId, formationId, name, matchDay, players } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Validate required fields
    if (!lobbyId || !formationId || !name || matchDay === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check if user is member of the lobby
    const lobbyMember = await prisma.lobbyMember.findFirst({
      where: {
        lobbyId,
        userId
      }
    });

    if (!lobbyMember) {
      res.status(403).json({ error: 'User is not a member of this lobby' });
      return;
    }

    // Check if team already exists for this user, lobby, and matchday
    const existingTeam = await prisma.team.findFirst({
      where: {
        userId,
        lobbyId,
        matchDay
      }
    });

    if (existingTeam) {
      res.status(409).json({ error: 'Team for this matchday already exists' });
      return;
    }

    // Validate formation exists
    const formation = await prisma.formation.findUnique({
      where: { id: formationId }
    });

    if (!formation) {
      res.status(404).json({ error: 'Formation not found' });
      return;
    }

    // Validate players array if provided
    if (players && players.length > 0) {
      if (players.length !== MATCH_SETTINGS.PLAYERS_PER_TEAM) {
        res.status(400).json({ 
          error: `Team must have exactly ${MATCH_SETTINGS.PLAYERS_PER_TEAM} players` 
        });
        return;
      }

      // Validate all players belong to user (with test mode for dummy/lobby players)
      const playerIds = players.map((p: any) => p.playerId).filter(Boolean);
      if (playerIds.length > 0) {
        // Get all requested players to check their themes
        const requestedPlayers = await prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, theme: true }
        });

        // Separate dummy/lobby players (available to everyone) from regular players
        const testPlayers = requestedPlayers.filter(p => 
          p.theme === 'DUMMY' || p.theme === 'LOBBY'
        ).map(p => p.id);
        
        const regularPlayerIds = playerIds.filter((id: string) => !testPlayers.includes(id));

        // Only check ownership for regular players
        if (regularPlayerIds.length > 0) {
          const userPlayers = await prisma.userPlayer.findMany({
            where: {
              userId,
              playerId: { in: regularPlayerIds }
            }
          });

          if (userPlayers.length !== regularPlayerIds.length) {
            res.status(403).json({ error: 'Some players do not belong to user' });
            return;
          }
        }

        // Validate unique players in matchday
        const uniqueValidation = await validateUniquePlayersInMatchday(
          userId,
          lobbyId,
          matchDay,
          playerIds
        );

        if (!uniqueValidation.isValid) {
          res.status(409).json({ 
            error: 'Player uniqueness violation',
            details: uniqueValidation.errors
          });
          return;
        }

        // Validate player positions match formation
        const actualPlayers = await prisma.player.findMany({
          where: { id: { in: playerIds } }
        });

        const formationPositions: PlayerPosition[] = JSON.parse(formation.positions);
        const playersWithPositions = players.map((p: any, index: number) => {
          const player = actualPlayers.find(ap => ap.id === p.playerId);
          return {
            position: player?.position as PlayerPosition,
            name: player?.name
          };
        }).filter((p: any) => p.position); // Only validate non-dummy players

        const positionValidation = validateTeamPositions(playersWithPositions, formationPositions);
        if (!positionValidation.isValid) {
          res.status(400).json({
            error: 'Player position validation failed',
            details: positionValidation.errors
          });
          return;
        }
      }
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        userId,
        lobbyId,
        formationId,
        name,
        matchDay
      },
      include: {
        formation: true
      }
    });

    // Add players (either provided or dummy players)
    let teamPlayersData;
    
    if (players && players.length > 0) {
      // Use provided players
      teamPlayersData = players.map((player: any, index: number) => ({
        teamId: team.id,
        playerId: player.playerId,
        position: index,
        points: player.points || 0,
        color: player.color || ''
      }));
    } else {
      // Auto-populate with dummy players based on formation
      const formationPositions = JSON.parse(formation.positions);
      teamPlayersData = createDummyTeamPlayers(team.id, formationPositions);
    }

    await prisma.teamPlayer.createMany({
      data: teamPlayersData
    });

    // Fetch complete team data
    const completeTeam = await prisma.team.findUnique({
      where: { id: team.id },
      include: {
        formation: true,
        teamPlayers: {
          include: {
            player: true
          },
          orderBy: {
            position: 'asc'
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: completeTeam
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      error: 'Failed to create team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update team
export const updateTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, players } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Check if team exists and belongs to user
    const existingTeam = await prisma.team.findFirst({
      where: {
        id,
        userId
      },
      include: {
        formation: true
      }
    });

    if (!existingTeam) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    // Validate players if provided
    if (players) {
      if (players.length !== MATCH_SETTINGS.PLAYERS_PER_TEAM) {
        res.status(400).json({ 
          error: `Team must have exactly ${MATCH_SETTINGS.PLAYERS_PER_TEAM} players` 
        });
        return;
      }

      // Validate all players belong to user (with test mode for dummy/lobby players)
      const playerIds = players.map((p: any) => p.playerId).filter(Boolean);
      if (playerIds.length > 0) {
        // Get all requested players to check their themes
        const requestedPlayers = await prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, theme: true }
        });

        // Separate dummy/lobby players (available to everyone) from regular players
        const testPlayers = requestedPlayers.filter(p => 
          p.theme === 'DUMMY' || p.theme === 'LOBBY'
        ).map(p => p.id);
        
        const regularPlayerIds = playerIds.filter((id: string) => !testPlayers.includes(id));

        // Only check ownership for regular players
        if (regularPlayerIds.length > 0) {
          const userPlayers = await prisma.userPlayer.findMany({
            where: {
              userId,
              playerId: { in: regularPlayerIds }
            }
          });

          if (userPlayers.length !== regularPlayerIds.length) {
            res.status(403).json({ error: 'Some players do not belong to user' });
            return;
          }
        }

        // Validate unique players in matchday (excluding current team)
        const uniqueValidation = await validateUniquePlayersInMatchday(
          userId,
          existingTeam.lobbyId,
          existingTeam.matchDay,
          playerIds,
          id // Exclude current team from validation
        );

        if (!uniqueValidation.isValid) {
          res.status(409).json({ 
            error: 'Player uniqueness violation',
            details: uniqueValidation.errors
          });
          return;
        }

        // Validate player positions match formation
        const actualPlayers = await prisma.player.findMany({
          where: { id: { in: playerIds } }
        });

        const formationPositions: PlayerPosition[] = JSON.parse(existingTeam.formation.positions);
        const playersWithPositions = players.map((p: any, index: number) => {
          const player = actualPlayers.find(ap => ap.id === p.playerId);
          return {
            position: player?.position as PlayerPosition,
            name: player?.name
          };
        }).filter((p: any) => p.position); // Only validate non-dummy players

        const positionValidation = validateTeamPositions(playersWithPositions, formationPositions);
        if (!positionValidation.isValid) {
          res.status(400).json({
            error: 'Player position validation failed',
            details: positionValidation.errors
          });
          return;
        }
      }
    }

    // Update team name if provided
    if (name) {
      await prisma.team.update({
        where: { id },
        data: { name }
      });
    }

    // Update players if provided
    if (players) {
      // Delete existing team players
      await prisma.teamPlayer.deleteMany({
        where: { teamId: id }
      });

      // Add new players
      const teamPlayersData = players.map((player: any, index: number) => ({
        teamId: id,
        playerId: player.playerId,
        position: index,
        points: player.points || 0,
        color: player.color || ''
      }));

      await prisma.teamPlayer.createMany({
        data: teamPlayersData
      });
    }

    // Fetch updated team
    const updatedTeam = await prisma.team.findUnique({
      where: { id },
      include: {
        formation: true,
        teamPlayers: {
          include: {
            player: true
          },
          orderBy: {
            position: 'asc'
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedTeam
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({
      error: 'Failed to update team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete team
export const deleteTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Check if team exists and belongs to user
    const existingTeam = await prisma.team.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingTeam) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    // Delete team (cascade will handle team players)
    await prisma.team.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({
      error: 'Failed to delete team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Validate team chemistry and positions
export const validateTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const team = await prisma.team.findFirst({
      where: {
        id,
        userId
      },
      include: {
        formation: true,
        teamPlayers: {
          include: {
            player: true
          },
          orderBy: {
            position: 'asc'
          }
        }
      }
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const players = team.teamPlayers.map(tp => tp.player);
    const errors: string[] = [];

    // Check player count
    if (players.length !== MATCH_SETTINGS.PLAYERS_PER_TEAM) {
      errors.push(`Team must have exactly ${MATCH_SETTINGS.PLAYERS_PER_TEAM} players`);
    }

    // Validate chemistry
    try {
      const playersWithColors = players.map(p => ({ color: p.color as any }));
      const chemistryValidation = validateTeamChemistry(playersWithColors);
      if (!chemistryValidation.isValid) {
        errors.push(...chemistryValidation.errors);
      }
    } catch (error) {
      errors.push('Invalid team chemistry');
    }

    // Check for duplicate players
    const playerIds = players.map(p => p.id);
    const duplicates = playerIds.filter((id, index) => playerIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push('Team cannot have duplicate players');
    }

    const isValid = errors.length === 0;

    res.json({
      success: true,
      data: {
        isValid,
        errors,
        playerCount: players.length,
        requiredPlayers: MATCH_SETTINGS.PLAYERS_PER_TEAM
      }
    });
  } catch (error) {
    console.error('Error validating team:', error);
    res.status(500).json({
      error: 'Failed to validate team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Check player availability in matchday
export const checkPlayerAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lobbyId, matchDay } = req.params;
    const { playerIds } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!lobbyId || !matchDay) {
      res.status(400).json({ error: 'Lobby ID and match day are required' });
      return;
    }

    if (!playerIds || !Array.isArray(playerIds)) {
      res.status(400).json({ error: 'Player IDs array is required' });
      return;
    }

    const usageChecks = await checkPlayerUsageInMatchday(
      userId,
      lobbyId,
      parseInt(matchDay),
      playerIds
    );

    res.json({
      success: true,
      data: usageChecks
    });
  } catch (error) {
    console.error('Error checking player availability:', error);
    res.status(500).json({
      error: 'Failed to check player availability',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all used players in a matchday
export const getUsedPlayersInMatchdayEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lobbyId, matchDay } = req.params;
    const { excludeTeamId } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!lobbyId || !matchDay) {
      res.status(400).json({ error: 'Lobby ID and match day are required' });
      return;
    }

    const usedPlayerIds = await getUsedPlayersInMatchday(
      userId,
      lobbyId,
      parseInt(matchDay),
      excludeTeamId as string
    );

    res.json({
      success: true,
      data: usedPlayerIds
    });
  } catch (error) {
    console.error('Error fetching used players:', error);
    res.status(500).json({
      error: 'Failed to fetch used players',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};