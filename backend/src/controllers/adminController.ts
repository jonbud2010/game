import { Request, Response } from 'express';
import { prisma } from '../db/connection';
import type { LobbyAdminRequest } from '../middleware/adminAuth';

/**
 * Admin Controller for Lobby-specific Content Management
 * Allows lobby admins to create and manage players, packs, and formations within their lobby
 */

// ===============================
// PLAYER MANAGEMENT
// ===============================

/**
 * Create a new player within the lobby
 */
export const createLobbyPlayer = async (req: LobbyAdminRequest, res: Response): Promise<void> => {
  try {
    const lobbyId = req.params.lobbyId!;
    const { name, imageUrl, points, position, color, marketPrice, theme, percentage } = req.body;

    // Validate required fields
    if (!name || !position || !color) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'name, position, and color are required'
      });
      return;
    }

    // Create player and link to lobby in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the player
      const player = await tx.player.create({
        data: {
          name,
          imageUrl: imageUrl || '/images/players/default.jpg',
          points: points || 50,
          position,
          color,
          marketPrice: marketPrice || 100,
          theme: theme || 'default',
          percentage: percentage || 1.0
        }
      });

      // Link player to lobby
      await tx.lobbyPlayer.create({
        data: {
          lobbyId,
          playerId: player.id
        }
      });

      return player;
    });

    res.status(201).json({
      success: true,
      message: 'Player created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating lobby player:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create player',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get all players within the lobby
 */
export const getLobbyPlayers = async (req: LobbyAdminRequest, res: Response): Promise<void> => {
  try {
    const lobbyId = req.params.lobbyId!;

    const lobbyPlayers = await prisma.lobbyPlayer.findMany({
      where: { lobbyId },
      include: {
        player: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const players = lobbyPlayers.map(lp => lp.player);

    res.json({
      success: true,
      data: players,
      count: players.length
    });
  } catch (error) {
    console.error('Error fetching lobby players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch players',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update a player within the lobby
 */
export const updateLobbyPlayer = async (req: LobbyAdminRequest, res: Response): Promise<void> => {
  try {
    const lobbyId = req.params.lobbyId!;
    const playerId = req.params.playerId!;
    const updateData = req.body;

    // Check if player exists in this lobby
    const lobbyPlayer = await prisma.lobbyPlayer.findUnique({
      where: {
        lobbyId_playerId: {
          lobbyId,
          playerId
        }
      }
    });

    if (!lobbyPlayer) {
      res.status(404).json({
        success: false,
        error: 'Player not found in this lobby'
      });
      return;
    }

    // Update the player
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Player updated successfully',
      data: updatedPlayer
    });
  } catch (error) {
    console.error('Error updating lobby player:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update player',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete a player from the lobby
 */
export const deleteLobbyPlayer = async (req: LobbyAdminRequest, res: Response): Promise<void> => {
  try {
    const lobbyId = req.params.lobbyId!;
    const playerId = req.params.playerId!;

    // Check if player exists in this lobby
    const lobbyPlayer = await prisma.lobbyPlayer.findUnique({
      where: {
        lobbyId_playerId: {
          lobbyId,
          playerId
        }
      }
    });

    if (!lobbyPlayer) {
      res.status(404).json({
        success: false,
        error: 'Player not found in this lobby'
      });
      return;
    }

    // Remove player from lobby (and all related data in transaction)
    await prisma.$transaction(async (tx) => {
      // Remove from lobby
      await tx.lobbyPlayer.delete({
        where: {
          lobbyId_playerId: {
            lobbyId,
            playerId
          }
        }
      });

      // Note: We don't delete the actual player record as it might be used elsewhere
      // Only remove the association with this lobby
    });

    res.json({
      success: true,
      message: 'Player removed from lobby successfully'
    });
  } catch (error) {
    console.error('Error deleting lobby player:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete player',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ===============================
// PACK MANAGEMENT
// ===============================

/**
 * Create a new pack within the lobby
 */
export const createLobbyPack = async (req: LobbyAdminRequest, res: Response): Promise<void> => {
  try {
    const lobbyId = req.params.lobbyId!;
    const { name, imageUrl, price, playerIds } = req.body;

    if (!name || typeof price !== 'number') {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'name and price are required'
      });
      return;
    }

    // Validate that all playerIds exist in this lobby
    if (playerIds && Array.isArray(playerIds) && playerIds.length > 0) {
      const lobbyPlayerCount = await prisma.lobbyPlayer.count({
        where: {
          lobbyId,
          playerId: { in: playerIds }
        }
      });

      if (lobbyPlayerCount !== playerIds.length) {
        res.status(400).json({
          success: false,
          error: 'Invalid players',
          details: 'Some players are not available in this lobby'
        });
        return;
      }
    }

    // Create pack and link to lobby in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the pack
      const pack = await tx.pack.create({
        data: {
          name,
          imageUrl: imageUrl || '/images/packs/default.jpg',
          price,
          status: 'ACTIVE'
        }
      });

      // Link pack to lobby
      await tx.lobbyPack.create({
        data: {
          lobbyId,
          packId: pack.id
        }
      });

      // Add players to pack if provided
      if (playerIds && Array.isArray(playerIds) && playerIds.length > 0) {
        const packPlayerData = playerIds.map(playerId => ({
          packId: pack.id,
          playerId
        }));

        await tx.packPlayer.createMany({
          data: packPlayerData
        });
      }

      // Fetch complete pack data
      const completePack = await tx.pack.findUnique({
        where: { id: pack.id },
        include: {
          packPlayers: {
            include: {
              player: true
            }
          }
        }
      });

      return completePack;
    });

    res.status(201).json({
      success: true,
      message: 'Pack created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating lobby pack:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create pack',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get all packs within the lobby
 */
export const getLobbyPacks = async (req: LobbyAdminRequest, res: Response): Promise<void> => {
  try {
    const lobbyId = req.params.lobbyId!;

    const lobbyPacks = await prisma.lobbyPack.findMany({
      where: { lobbyId },
      include: {
        pack: {
          include: {
            packPlayers: {
              include: {
                player: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const packs = lobbyPacks.map(lp => ({
      ...lp.pack,
      playerCount: lp.pack.packPlayers.length,
      totalPercentage: lp.pack.packPlayers.reduce((sum, pp) => sum + pp.player.percentage, 0)
    }));

    res.json({
      success: true,
      data: packs,
      count: packs.length
    });
  } catch (error) {
    console.error('Error fetching lobby packs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch packs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ===============================
// FORMATION MANAGEMENT
// ===============================

/**
 * Create a new formation within the lobby
 */
export const createLobbyFormation = async (req: LobbyAdminRequest, res: Response): Promise<void> => {
  try {
    const lobbyId = req.params.lobbyId!;
    const { name, imageUrl, positions } = req.body;

    if (!name || !positions) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'name and positions are required'
      });
      return;
    }

    // Validate positions (should be array of 11 position objects)
    let parsedPositions;
    try {
      parsedPositions = typeof positions === 'string' ? JSON.parse(positions) : positions;
      if (!Array.isArray(parsedPositions) || parsedPositions.length !== 11) {
        throw new Error('Positions must be an array of 11 position objects');
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Invalid positions format',
        details: 'Positions must be a valid JSON array of 11 position objects'
      });
      return;
    }

    // Create formation and link to lobby in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the formation
      const formation = await tx.formation.create({
        data: {
          name,
          imageUrl: imageUrl || '/images/formations/default.jpg',
          positions: JSON.stringify(parsedPositions)
        }
      });

      // Link formation to lobby
      await tx.lobbyFormation.create({
        data: {
          lobbyId,
          formationId: formation.id
        }
      });

      return formation;
    });

    res.status(201).json({
      success: true,
      message: 'Formation created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating lobby formation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create formation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get all formations within the lobby
 */
export const getLobbyFormations = async (req: LobbyAdminRequest, res: Response): Promise<void> => {
  try {
    const lobbyId = req.params.lobbyId!;

    const lobbyFormations = await prisma.lobbyFormation.findMany({
      where: { lobbyId },
      include: {
        formation: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formations = lobbyFormations.map(lf => ({
      ...lf.formation,
      positions: JSON.parse(lf.formation.positions)
    }));

    res.json({
      success: true,
      data: formations,
      count: formations.length
    });
  } catch (error) {
    console.error('Error fetching lobby formations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch formations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};