import { Request, Response } from 'express';
import { prisma } from '../db/client';
import { calculateTeamChemistry, validateTeamChemistry } from '@football-tcg/shared';
import { MATCH_SETTINGS } from '@football-tcg/shared';

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

    // Validate players array
    if (players && players.length > 0) {
      if (players.length !== MATCH_SETTINGS.PLAYERS_PER_TEAM) {
        res.status(400).json({ 
          error: `Team must have exactly ${MATCH_SETTINGS.PLAYERS_PER_TEAM} players` 
        });
        return;
      }

      // Validate all players belong to user
      const playerIds = players.map((p: any) => p.playerId).filter(Boolean);
      if (playerIds.length > 0) {
        const userPlayers = await prisma.userPlayer.findMany({
          where: {
            userId,
            playerId: { in: playerIds }
          }
        });

        if (userPlayers.length !== playerIds.length) {
          res.status(403).json({ error: 'Some players do not belong to user' });
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

    // Add players if provided
    if (players && players.length > 0) {
      const teamPlayersData = players.map((player: any, index: number) => ({
        teamId: team.id,
        playerId: player.playerId,
        position: index,
        points: player.points || 0,
        color: player.color || ''
      }));

      await prisma.teamPlayer.createMany({
        data: teamPlayersData
      });
    }

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

      // Validate all players belong to user
      const playerIds = players.map((p: any) => p.playerId).filter(Boolean);
      if (playerIds.length > 0) {
        const userPlayers = await prisma.userPlayer.findMany({
          where: {
            userId,
            playerId: { in: playerIds }
          }
        });

        if (userPlayers.length !== playerIds.length) {
          res.status(403).json({ error: 'Some players do not belong to user' });
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