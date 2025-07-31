import { Request, Response } from 'express';
import { prisma } from '../db/client';

/**
 * Pack Controller
 * Handles CRUD operations for game packs and player pool management
 */

// Get all packs
export const getAllPacks = async (req: Request, res: Response): Promise<void> => {
  try {
    const packs = await prisma.pack.findMany({
      include: {
        packPlayers: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                points: true,
                position: true,
                color: true,
                percentage: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate total percentage for each pack
    const packsWithStats = packs.map(pack => {
      const totalPercentage = pack.packPlayers.reduce((sum, pp) => sum + pp.player.percentage, 0);
      const playerCount = pack.packPlayers.length;
      
      return {
        ...pack,
        playerCount,
        totalPercentage: Math.round(totalPercentage * 10000) / 100, // Convert to percentage with 2 decimals
        players: pack.packPlayers.map(pp => ({
          id: pp.player.id,
          name: pp.player.name,
          points: pp.player.points,
          position: pp.player.position,
          color: pp.player.color,
          percentage: pp.player.percentage
        }))
      };
    });

    res.json({
      success: true,
      data: packsWithStats,
      count: packs.length
    });
  } catch (error) {
    console.error('Error fetching packs:', error);
    res.status(500).json({
      error: 'Failed to fetch packs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get pack by ID
export const getPackById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const pack = await prisma.pack.findUnique({
      where: { id },
      include: {
        packPlayers: {
          include: {
            player: true
          }
        }
      }
    });

    if (!pack) {
      res.status(404).json({
        error: 'Pack not found',
        message: `No pack found with ID: ${id}`
      });
      return;
    }

    // Calculate statistics
    const totalPercentage = pack.packPlayers.reduce((sum, pp) => sum + pp.player.percentage, 0);
    const playerCount = pack.packPlayers.length;
    
    res.json({
      success: true,
      data: {
        ...pack,
        playerCount,
        totalPercentage: Math.round(totalPercentage * 10000) / 100,
        players: pack.packPlayers.map(pp => pp.player)
      }
    });
  } catch (error) {
    console.error('Error fetching pack:', error);
    res.status(500).json({
      error: 'Failed to fetch pack',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new pack
export const createPack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, price, playerIds } = req.body;
    
    // Default imageUrl if not provided (will be updated via file upload)
    const imageUrl = req.body.imageUrl || '/images/packs/default.jpg';

    // Validate playerIds if provided
    if (playerIds && Array.isArray(playerIds)) {
      // Check if all players exist
      const existingPlayers = await prisma.player.findMany({
        where: {
          id: {
            in: playerIds
          }
        }
      });

      if (existingPlayers.length !== playerIds.length) {
        res.status(400).json({
          error: 'Invalid players',
          message: 'Some player IDs do not exist'
        });
        return;
      }
    }

    // Create pack with transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the pack
      const pack = await tx.pack.create({
        data: {
          name,
          imageUrl,
          price,
          status: 'ACTIVE'
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
    console.error('Error creating pack:', error);
    
    // Handle unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      res.status(400).json({
        error: 'Pack already exists',
        message: 'A pack with this name already exists'
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to create pack',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update pack
export const updatePack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, imageUrl, price, status } = req.body;

    // Check if pack exists
    const existingPack = await prisma.pack.findUnique({
      where: { id }
    });

    if (!existingPack) {
      res.status(404).json({
        error: 'Pack not found',
        message: `No pack found with ID: ${id}`
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (price !== undefined) updateData.price = price;
    if (status !== undefined) {
      if (!['ACTIVE', 'INACTIVE', 'EMPTY'].includes(status)) {
        res.status(400).json({
          error: 'Invalid status',
          message: 'Status must be ACTIVE, INACTIVE, or EMPTY'
        });
        return;
      }
      updateData.status = status;
    }

    const updatedPack = await prisma.pack.update({
      where: { id },
      data: updateData,
      include: {
        packPlayers: {
          include: {
            player: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Pack updated successfully',
      data: updatedPack
    });
  } catch (error) {
    console.error('Error updating pack:', error);
    
    // Handle unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      res.status(400).json({
        error: 'Update conflict',
        message: 'A pack with this name already exists'
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to update pack',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete pack
export const deletePack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if pack exists
    const existingPack = await prisma.pack.findUnique({
      where: { id },
      include: {
        packPlayers: true
      }
    });

    if (!existingPack) {
      res.status(404).json({
        error: 'Pack not found',
        message: `No pack found with ID: ${id}`
      });
      return;
    }

    // Delete pack (cascade will handle packPlayers)
    await prisma.pack.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Pack deleted successfully',
      data: { id }
    });
  } catch (error) {
    console.error('Error deleting pack:', error);
    res.status(500).json({
      error: 'Failed to delete pack',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Add players to pack
export const addPlayersTopack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { playerIds } = req.body;

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      res.status(400).json({
        error: 'Invalid player IDs',
        message: 'playerIds must be a non-empty array'
      });
      return;
    }

    // Check if pack exists
    const pack = await prisma.pack.findUnique({
      where: { id }
    });

    if (!pack) {
      res.status(404).json({
        error: 'Pack not found',
        message: `No pack found with ID: ${id}`
      });
      return;
    }

    // Check if all players exist
    const existingPlayers = await prisma.player.findMany({
      where: {
        id: {
          in: playerIds
        }
      }
    });

    if (existingPlayers.length !== playerIds.length) {
      res.status(400).json({
        error: 'Invalid players',
        message: 'Some player IDs do not exist'
      });
      return;
    }

    // Check which players are already in the pack
    const existingPackPlayers = await prisma.packPlayer.findMany({
      where: {
        packId: id,
        playerId: {
          in: playerIds
        }
      }
    });

    const alreadyInPack = existingPackPlayers.map(pp => pp.playerId);
    const newPlayerIds = playerIds.filter(playerId => !alreadyInPack.includes(playerId));

    if (newPlayerIds.length === 0) {
      res.status(400).json({
        error: 'Players already in pack',
        message: 'All specified players are already in this pack'
      });
      return;
    }

    // Add new players to pack
    const packPlayerData = newPlayerIds.map(playerId => ({
      packId: id,
      playerId
    }));

    await prisma.packPlayer.createMany({
      data: packPlayerData
    });

    // Fetch updated pack
    const updatedPack = await prisma.pack.findUnique({
      where: { id },
      include: {
        packPlayers: {
          include: {
            player: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: `Added ${newPlayerIds.length} players to pack`,
      data: updatedPack,
      addedPlayers: newPlayerIds.length,
      skippedPlayers: alreadyInPack.length
    });
  } catch (error) {
    console.error('Error adding players to pack:', error);
    res.status(500).json({
      error: 'Failed to add players to pack',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Remove players from pack
export const removePlayersFromPack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { playerIds } = req.body;

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      res.status(400).json({
        error: 'Invalid player IDs',
        message: 'playerIds must be a non-empty array'
      });
      return;
    }

    // Check if pack exists
    const pack = await prisma.pack.findUnique({
      where: { id }
    });

    if (!pack) {
      res.status(404).json({
        error: 'Pack not found',
        message: `No pack found with ID: ${id}`
      });
      return;
    }

    // Remove players from pack
    const deletedCount = await prisma.packPlayer.deleteMany({
      where: {
        packId: id,
        playerId: {
          in: playerIds
        }
      }
    });

    // Fetch updated pack
    const updatedPack = await prisma.pack.findUnique({
      where: { id },
      include: {
        packPlayers: {
          include: {
            player: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: `Removed ${deletedCount.count} players from pack`,
      data: updatedPack,
      removedPlayers: deletedCount.count
    });
  } catch (error) {
    console.error('Error removing players from pack:', error);
    res.status(500).json({
      error: 'Failed to remove players from pack',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get available packs (for players to buy)
export const getAvailablePacks = async (req: Request, res: Response): Promise<void> => {
  try {
    const packs = await prisma.pack.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        packPlayers: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                points: true,
                position: true,
                color: true
              }
            }
          }
        }
      },
      orderBy: {
        price: 'asc'
      }
    });

    // Only show basic info for players (not admin view)
    const publicPacks = packs.map(pack => ({
      id: pack.id,
      name: pack.name,
      imageUrl: pack.imageUrl,
      price: pack.price,
      playerCount: pack.packPlayers.length,
      status: pack.status
    }));

    res.json({
      success: true,
      data: publicPacks,
      count: publicPacks.length
    });
  } catch (error) {
    console.error('Error fetching available packs:', error);
    res.status(500).json({
      error: 'Failed to fetch available packs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Open pack - percentage-based player drawing
export const openPack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Check if pack exists and is active
    const pack = await prisma.pack.findUnique({
      where: { id },
      include: {
        packPlayers: {
          include: {
            player: true
          }
        }
      }
    });

    if (!pack) {
      res.status(404).json({ error: 'Pack not found' });
      return;
    }

    if (pack.status !== 'ACTIVE') {
      res.status(400).json({ 
        error: 'Pack not available', 
        message: 'This pack is no longer available for purchase' 
      });
      return;
    }

    if (pack.packPlayers.length === 0) {
      res.status(400).json({ 
        error: 'Empty pack', 
        message: 'This pack has no players available' 
      });
      return;
    }

    // Check if user has enough coins
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.coins < pack.price) {
      res.status(400).json({ 
        error: 'Insufficient coins', 
        message: `You need ${pack.price} coins to open this pack` 
      });
      return;
    }

    // Calculate total percentage and validate
    const totalPercentage = pack.packPlayers.reduce((sum, pp) => sum + pp.player.percentage, 0);
    
    if (totalPercentage <= 0) {
      res.status(500).json({ 
        error: 'Invalid pack configuration', 
        message: 'Pack has invalid percentage distribution' 
      });
      return;
    }

    // Draw player based on percentage
    const randomValue = Math.random() * totalPercentage;
    let currentSum = 0;
    let drawnPlayer = null;

    for (const packPlayer of pack.packPlayers) {
      currentSum += packPlayer.player.percentage;
      if (randomValue <= currentSum) {
        drawnPlayer = packPlayer.player;
        break;
      }
    }

    if (!drawnPlayer) {
      // Fallback to first player if something goes wrong
      drawnPlayer = pack.packPlayers[0].player;
    }

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Deduct coins from user
      await tx.user.update({
        where: { id: userId },
        data: {
          coins: {
            decrement: pack.price
          }
        }
      });

      // Add player to user's collection
      const userPlayer = await tx.userPlayer.create({
        data: {
          userId,
          playerId: drawnPlayer.id
        }
      });

      // Remove player from pack (shrinking pool)
      await tx.packPlayer.delete({
        where: {
          packId_playerId: {
            packId: id,
            playerId: drawnPlayer.id
          }
        }
      });

      // Check if pack is now empty and update status
      const remainingPlayers = await tx.packPlayer.count({
        where: { packId: id }
      });

      if (remainingPlayers === 0) {
        await tx.pack.update({
          where: { id },
          data: { status: 'EMPTY' }
        });
      }

      return {
        userPlayer,
        drawnPlayer,
        remainingPlayers,
        packNowEmpty: remainingPlayers === 0
      };
    });

    // Get updated user coins
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true }
    });

    res.json({
      success: true,
      message: 'Pack opened successfully!',
      data: {
        drawnPlayer: result.drawnPlayer,
        coinsSpent: pack.price,
        remainingCoins: updatedUser?.coins || 0,
        remainingPlayersInPack: result.remainingPlayers,
        packNowEmpty: result.packNowEmpty
      }
    });
  } catch (error) {
    console.error('Error opening pack:', error);
    res.status(500).json({
      error: 'Failed to open pack',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Recalculate pack percentages (for dynamic pool management)
export const recalculatePackPercentages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const pack = await prisma.pack.findUnique({
      where: { id },
      include: {
        packPlayers: {
          include: {
            player: true
          }
        }
      }
    });

    if (!pack) {
      res.status(404).json({ error: 'Pack not found' });
      return;
    }

    // Calculate current total percentage
    const currentTotal = pack.packPlayers.reduce((sum, pp) => sum + pp.player.percentage, 0);
    
    if (currentTotal === 0) {
      res.status(400).json({ 
        error: 'Cannot recalculate', 
        message: 'Pack has no players with valid percentages' 
      });
      return;
    }

    // Normalize percentages to maintain proportions but ensure they sum to 100
    const targetTotal = 1.0; // 100%
    const scaleFactor = targetTotal / currentTotal;

    const updates = pack.packPlayers.map(pp => ({
      playerId: pp.player.id,
      oldPercentage: pp.player.percentage,
      newPercentage: pp.player.percentage * scaleFactor
    }));

    // Update player percentages
    await Promise.all(
      updates.map(update =>
        prisma.player.update({
          where: { id: update.playerId },
          data: { percentage: update.newPercentage }
        })
      )
    );

    // Get updated pack data
    const updatedPack = await prisma.pack.findUnique({
      where: { id },
      include: {
        packPlayers: {
          include: {
            player: true
          }
        }
      }
    });

    const newTotal = updatedPack?.packPlayers.reduce((sum, pp) => sum + pp.player.percentage, 0) || 0;

    res.json({
      success: true,
      message: 'Pack percentages recalculated',
      data: {
        pack: updatedPack,
        recalculation: {
          oldTotal: currentTotal,
          newTotal,
          scaleFactor,
          updates
        }
      }
    });
  } catch (error) {
    console.error('Error recalculating pack percentages:', error);
    res.status(500).json({
      error: 'Failed to recalculate percentages',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};