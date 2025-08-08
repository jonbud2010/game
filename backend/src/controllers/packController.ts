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
        },
        packFormations: {
          include: {
            formation: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                positions: true,
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
      const playerPercentage = pack.packPlayers?.reduce((sum, pp) => sum + pp.player.percentage, 0) || 0;
      const formationPercentage = pack.packFormations?.reduce((sum, pf) => sum + pf.formation.percentage, 0) || 0;
      const totalPercentage = playerPercentage + formationPercentage;
      const playerCount = pack.packPlayers?.length || 0;
      const formationCount = pack.packFormations?.length || 0;
      
      return {
        ...pack,
        playerCount,
        formationCount,
        totalItemCount: playerCount + formationCount,
        totalPercentage: Math.round(totalPercentage * 10000) / 100, // Convert to percentage with 2 decimals
        players: pack.packPlayers?.map(pp => ({
          id: pp.player.id,
          name: pp.player.name,
          points: pp.player.points,
          position: pp.player.position,
          color: pp.player.color,
          percentage: pp.player.percentage
        })) || [],
        formations: pack.packFormations?.map(pf => ({
          id: pf.formation.id,
          name: pf.formation.name,
          imageUrl: pf.formation.imageUrl,
          positions: pf.formation.positions,
          percentage: pf.formation.percentage
        })) || []
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
        },
        packFormations: {
          include: {
            formation: true
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
    const playerPercentage = pack.packPlayers?.reduce((sum, pp) => sum + pp.player.percentage, 0) || 0;
    const formationPercentage = pack.packFormations?.reduce((sum, pf) => sum + pf.formation.percentage, 0) || 0;
    const totalPercentage = playerPercentage + formationPercentage;
    const playerCount = pack.packPlayers?.length || 0;
    const formationCount = pack.packFormations?.length || 0;
    
    res.json({
      success: true,
      data: {
        ...pack,
        playerCount,
        formationCount,
        totalItemCount: playerCount + formationCount,
        totalPercentage: Math.round(totalPercentage * 10000) / 100,
        players: pack.packPlayers?.map(pp => pp.player) || [],
        formations: pack.packFormations?.map(pf => pf.formation) || []
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
    console.log('=== CREATE PACK CONTROLLER ===');
    console.log('req.body:', req.body);
    console.log('name type:', typeof req.body.name);
    console.log('price type:', typeof req.body.price);
    console.log('status type:', typeof req.body.status);
    
    const { name, price, playerIds, formationIds } = req.body;
    
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

    // Validate formationIds if provided
    if (formationIds && Array.isArray(formationIds)) {
      // Check if all formations exist
      const existingFormations = await prisma.formation.findMany({
        where: {
          id: {
            in: formationIds
          }
        }
      });

      if (existingFormations.length !== formationIds.length) {
        res.status(400).json({
          error: 'Invalid formations',
          message: 'Some formation IDs do not exist'
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

      // Add formations to pack if provided
      if (formationIds && Array.isArray(formationIds) && formationIds.length > 0) {
        const packFormationData = formationIds.map(formationId => ({
          packId: pack.id,
          formationId
        }));

        await tx.packFormation.createMany({
          data: packFormationData
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
          },
          packFormations: {
            include: {
              formation: true
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
export const addPlayersToPack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { playerIds } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Pack ID is required' });
      return;
    }

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
        },
        packFormations: {
          include: {
            formation: true
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

    if ((pack.packPlayers?.length || 0) === 0 && (pack.packFormations?.length || 0) === 0) {
      res.status(400).json({ 
        error: 'Empty pack', 
        message: 'This pack has no items available' 
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
    const playerPercentage = pack.packPlayers?.reduce((sum, pp) => sum + pp.player.percentage, 0) || 0;
    const formationPercentage = pack.packFormations?.reduce((sum, pf) => sum + pf.formation.percentage, 0) || 0;
    const totalPercentage = playerPercentage + formationPercentage;
    
    if (totalPercentage <= 0) {
      res.status(500).json({ 
        error: 'Invalid pack configuration', 
        message: 'Pack has invalid percentage distribution' 
      });
      return;
    }

    // Draw item based on percentage (unified pool)
    const randomValue = Math.random() * totalPercentage;
    let currentSum = 0;
    let drawnPlayer = null;
    let drawnFormation = null;
    let itemType: 'player' | 'formation' = 'player';

    // First check players
    for (const packPlayer of pack.packPlayers || []) {
      currentSum += packPlayer.player.percentage;
      if (randomValue <= currentSum) {
        drawnPlayer = packPlayer.player;
        itemType = 'player';
        break;
      }
    }

    // If no player was drawn, check formations
    if (!drawnPlayer) {
      for (const packFormation of pack.packFormations || []) {
        currentSum += packFormation.formation.percentage;
        if (randomValue <= currentSum) {
          drawnFormation = packFormation.formation;
          itemType = 'formation';
          break;
        }
      }
    }

    // Fallback to first available item
    if (!drawnPlayer && !drawnFormation) {
      if ((pack.packPlayers?.length || 0) > 0) {
        drawnPlayer = pack.packPlayers![0]!.player;
        itemType = 'player';
      } else if ((pack.packFormations?.length || 0) > 0) {
        drawnFormation = pack.packFormations![0]!.formation;
        itemType = 'formation';
      }
    }

    if (!drawnPlayer && !drawnFormation) {
      res.status(500).json({ 
        error: 'No items available in pack',
        message: 'Pack appears to be empty or corrupted'
      });
      return;
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

      let userPlayer = null;
      let userFormation = null;

      if (itemType === 'player' && drawnPlayer) {
        // Add player to user's collection
        userPlayer = await tx.userPlayer.create({
          data: {
            userId,
            playerId: drawnPlayer!.id
          }
        });

        // Remove player from pack (shrinking pool)
        await tx.packPlayer.delete({
          where: {
            packId_playerId: {
              packId: id!,
              playerId: drawnPlayer!.id
            }
          }
        });
      } else if (itemType === 'formation' && drawnFormation) {
        // Add formation to user's collection
        userFormation = await tx.userFormation.create({
          data: {
            userId,
            formationId: drawnFormation!.id
          }
        });

        // Remove formation from pack (shrinking pool)
        await tx.packFormation.delete({
          where: {
            packId_formationId: {
              packId: id!,
              formationId: drawnFormation!.id
            }
          }
        });
      }

      // Check if pack is now empty and update status
      const remainingPlayers = await tx.packPlayer.count({
        where: { packId: id! }
      });
      const remainingFormations = await tx.packFormation.count({
        where: { packId: id! }
      });
      const totalRemainingItems = remainingPlayers + remainingFormations;

      if (totalRemainingItems === 0) {
        await tx.pack.update({
          where: { id: id! },
          data: { status: 'EMPTY' }
        });
      }

      return {
        userPlayer,
        userFormation,
        drawnPlayer,
        drawnFormation,
        itemType,
        remainingPlayers,
        remainingFormations,
        totalRemainingItems,
        packNowEmpty: totalRemainingItems === 0
      };
    });

    // Get updated user coins
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true }
    });

    const responseData: any = {
      itemType: result.itemType,
      coinsSpent: pack.price,
      remainingCoins: updatedUser?.coins || 0,
      remainingItemsInPack: result.totalRemainingItems,
      remainingPlayersInPack: result.remainingPlayers,
      remainingFormationsInPack: result.remainingFormations,
      packNowEmpty: result.packNowEmpty
    };

    if (result.itemType === 'player' && result.drawnPlayer) {
      responseData.player = {
        id: result.drawnPlayer.id,
        name: result.drawnPlayer.name,
        imageUrl: result.drawnPlayer.imageUrl,
        points: result.drawnPlayer.points,
        position: result.drawnPlayer.position,
        color: result.drawnPlayer.color,
        theme: result.drawnPlayer.theme
      };
    } else if (result.itemType === 'formation' && result.drawnFormation) {
      responseData.formation = {
        id: result.drawnFormation.id,
        name: result.drawnFormation.name,
        imageUrl: result.drawnFormation.imageUrl,
        positions: result.drawnFormation.positions
      };
    }

    res.json({
      success: true,
      message: `Pack opened successfully! You got a ${result.itemType}!`,
      data: responseData
    });
  } catch (error) {
    console.error('Error opening pack:', error);
    res.status(500).json({
      error: 'Failed to open pack',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Add formations to pack
export const addFormationsToPack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { formationIds } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Pack ID is required' });
      return;
    }

    if (!Array.isArray(formationIds) || formationIds.length === 0) {
      res.status(400).json({
        error: 'Invalid formation IDs',
        message: 'formationIds must be a non-empty array'
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

    // Check if all formations exist
    const existingFormations = await prisma.formation.findMany({
      where: {
        id: {
          in: formationIds
        }
      }
    });

    if (existingFormations.length !== formationIds.length) {
      res.status(400).json({
        error: 'Invalid formations',
        message: 'Some formation IDs do not exist'
      });
      return;
    }

    // Check which formations are already in the pack
    const existingPackFormations = await prisma.packFormation.findMany({
      where: {
        packId: id,
        formationId: {
          in: formationIds
        }
      }
    });

    const alreadyInPack = existingPackFormations.map(pf => pf.formationId);
    const newFormationIds = formationIds.filter(formationId => !alreadyInPack.includes(formationId));

    if (newFormationIds.length === 0) {
      res.status(400).json({
        error: 'Formations already in pack',
        message: 'All specified formations are already in this pack'
      });
      return;
    }

    // Add new formations to pack
    const packFormationData = newFormationIds.map(formationId => ({
      packId: id,
      formationId
    }));

    await prisma.packFormation.createMany({
      data: packFormationData
    });

    // Fetch updated pack
    const updatedPack = await prisma.pack.findUnique({
      where: { id },
      include: {
        packPlayers: {
          include: {
            player: true
          }
        },
        packFormations: {
          include: {
            formation: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: `Added ${newFormationIds.length} formations to pack`,
      data: updatedPack,
      addedFormations: newFormationIds.length,
      skippedFormations: alreadyInPack.length
    });
  } catch (error) {
    console.error('Error adding formations to pack:', error);
    res.status(500).json({
      error: 'Failed to add formations to pack',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Remove formations from pack
export const removeFormationsFromPack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { formationIds } = req.body;

    if (!Array.isArray(formationIds) || formationIds.length === 0) {
      res.status(400).json({
        error: 'Invalid formation IDs',
        message: 'formationIds must be a non-empty array'
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

    // Remove formations from pack
    const deletedCount = await prisma.packFormation.deleteMany({
      where: {
        packId: id,
        formationId: {
          in: formationIds
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
        },
        packFormations: {
          include: {
            formation: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: `Removed ${deletedCount.count} formations from pack`,
      data: updatedPack,
      removedFormations: deletedCount.count
    });
  } catch (error) {
    console.error('Error removing formations from pack:', error);
    res.status(500).json({
      error: 'Failed to remove formations from pack',
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
        },
        packFormations: {
          include: {
            formation: true
          }
        }
      }
    });

    if (!pack) {
      res.status(404).json({ error: 'Pack not found' });
      return;
    }

    // Calculate current total percentage
    const playerTotal = pack.packPlayers.reduce((sum, pp) => sum + pp.player.percentage, 0);
    const formationTotal = pack.packFormations.reduce((sum, pf) => sum + pf.formation.percentage, 0);
    const currentTotal = playerTotal + formationTotal;
    
    if (currentTotal === 0) {
      res.status(400).json({ 
        error: 'Cannot recalculate', 
        message: 'Pack has no items with valid percentages' 
      });
      return;
    }

    // Normalize percentages to maintain proportions but ensure they sum to 100
    const targetTotal = 1.0; // 100%
    const scaleFactor = targetTotal / currentTotal;

    const playerUpdates = pack.packPlayers.map(pp => ({
      playerId: pp.player.id,
      oldPercentage: pp.player.percentage,
      newPercentage: pp.player.percentage * scaleFactor
    }));

    const formationUpdates = pack.packFormations.map(pf => ({
      formationId: pf.formation.id,
      oldPercentage: pf.formation.percentage,
      newPercentage: pf.formation.percentage * scaleFactor
    }));

    // Update player percentages
    await Promise.all(
      playerUpdates.map(update =>
        prisma.player.update({
          where: { id: update.playerId },
          data: { percentage: update.newPercentage }
        })
      )
    );

    // Update formation percentages
    await Promise.all(
      formationUpdates.map(update =>
        prisma.formation.update({
          where: { id: update.formationId },
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
        },
        packFormations: {
          include: {
            formation: true
          }
        }
      }
    });

    const newPlayerTotal = updatedPack?.packPlayers.reduce((sum, pp) => sum + pp.player.percentage, 0) || 0;
    const newFormationTotal = updatedPack?.packFormations.reduce((sum, pf) => sum + pf.formation.percentage, 0) || 0;
    const newTotal = newPlayerTotal + newFormationTotal;

    res.json({
      success: true,
      message: 'Pack percentages recalculated',
      data: {
        pack: updatedPack,
        recalculation: {
          oldTotal: currentTotal,
          newTotal,
          scaleFactor,
          playerUpdates,
          formationUpdates
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