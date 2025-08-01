import { Request, Response } from 'express';
import { prisma } from '../db/connection';

/**
 * Player Controller
 * Handles CRUD operations for football players
 */

// Color mapping for English to German color names
const englishToGerman: { [key: string]: string } = {
  'green': 'hellgruen',
  'darkgreen': 'dunkelgruen',
  'blue': 'hellblau',
  'darkblue': 'dunkelblau',
  'red': 'rot',
  'yellow': 'gelb',
  'purple': 'lila',
  'orange': 'orange'
};

// Get all players
export const getAllPlayers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { position, color, minPoints, maxPrice } = req.query;
    
    const where: any = {};
    
    if (position) where.position = position;
    if (color) where.color = color;
    if (minPoints) where.points = { ...where.points, gte: parseInt(minPoints as string) };
    if (maxPrice) where.marketPrice = { ...where.marketPrice, lte: parseInt(maxPrice as string) };

    const players = await prisma.player.findMany({
      where,
      orderBy: { points: 'desc' }
    });

    res.json({
      success: true,
      data: players,
      count: players.length
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch players',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get player by ID
export const getPlayerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        userPlayers: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        packPlayers: {
          include: {
            pack: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!player) {
      res.status(404).json({
        success: false,
        error: 'Player not found',
        message: `No player found with ID: ${id}`
      });
      return;
    }

    res.json({
      success: true,
      data: player
    });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new player
export const createPlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== CREATE PLAYER REQUEST ===');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    
    const { name, points, position, color, marketPrice, theme, percentage } = req.body;
    
    // Validation
    const validationErrors: string[] = [];
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      validationErrors.push('Name is required and must be a non-empty string');
    }
    
    if (points === undefined || points === null || typeof points !== 'number' || points < 0) {
      validationErrors.push('Points must be a non-negative number');
    }
    
    const validPositions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'LF', 'RF'];
    if (!position || !validPositions.includes(position)) {
      validationErrors.push(`Position must be one of: ${validPositions.join(', ')}`);
    }
    
    const validColors = ['dunkelgruen', 'hellgruen', 'dunkelblau', 'hellblau', 'rot', 'gelb', 'lila', 'orange'];
    
    if (!color || (!validColors.includes(color.toLowerCase()) && !englishToGerman[color.toLowerCase()])) {
      validationErrors.push(`Color must be one of: ${validColors.join(', ')} or English equivalents`);
    }
    
    if (marketPrice !== undefined && (typeof marketPrice !== 'number' || marketPrice < 0)) {
      validationErrors.push('Market price must be a non-negative number');
    }
    
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
      return;
    }
    
    // Default imageUrl if not provided (will be updated via file upload)
    const imageUrl = req.body.imageUrl || '/images/players/default.jpg';
    
    // Convert English color names to German if needed
    let finalColor = color ? color.toLowerCase() : 'hellgruen';
    if (englishToGerman[finalColor]) {
      finalColor = englishToGerman[finalColor];
    }

    const player = await prisma.player.create({
      data: {
        name,
        imageUrl,
        points,
        position,
        color: finalColor.toUpperCase(),
        marketPrice: marketPrice || 0,
        theme: theme || 'basic',
        percentage: percentage || 0.05
      }
    });

    res.status(201).json({
      success: true,
      message: 'Player created successfully',
      data: player
    });
  } catch (error) {
    console.error('Error creating player:', error);
    
    // Handle unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      res.status(400).json({
        success: false,
        error: 'Player already exists',
        message: 'A player with this name already exists'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create player',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update player
export const updatePlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Ensure color is uppercase if provided
    if (updateData.color) {
      updateData.color = updateData.color.toUpperCase();
    }

    // Check if player exists
    const existingPlayer = await prisma.player.findUnique({
      where: { id }
    });

    if (!existingPlayer) {
      res.status(404).json({
        success: false,
        error: 'Player not found',
        message: `No player found with ID: ${id}`
      });
      return;
    }

    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Player updated successfully',
      data: updatedPlayer
    });
  } catch (error) {
    console.error('Error updating player:', error);
    
    // Handle unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      res.status(400).json({
        success: false,
        error: 'Update conflict',
        message: 'A player with these details already exists'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update player',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete player
export const deletePlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const forceDelete = req.query.force === 'true';

    // Check if player exists
    const existingPlayer = await prisma.player.findUnique({
      where: { id },
      include: {
        userPlayers: true,
        teamPlayers: true,
        packPlayers: true
      }
    });

    if (!existingPlayer) {
      res.status(404).json({
        success: false,
        error: 'Player not found',
        message: `No player found with ID: ${id}`
      });
      return;
    }

    // Check if force delete is required
    const hasReferences = (existingPlayer.userPlayers && existingPlayer.userPlayers.length > 0) || 
                         (existingPlayer.teamPlayers && existingPlayer.teamPlayers.length > 0) ||
                         (existingPlayer.packPlayers && existingPlayer.packPlayers.length > 0);

    if (hasReferences && !forceDelete) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete player',
        message: 'Player is currently in use. Use ?force=true to force delete and remove all references.',
        details: {
          ownedByUsers: existingPlayer.userPlayers ? existingPlayer.userPlayers.length : 0,
          usedInTeams: existingPlayer.teamPlayers ? existingPlayer.teamPlayers.length : 0,
          inPacks: existingPlayer.packPlayers ? existingPlayer.packPlayers.length : 0
        },
        forceDeleteUrl: `/players/${id}?force=true`
      });
      return;
    }

    // If force delete or no references, proceed with cascade cleanup
    if (hasReferences) {
      console.log(`Force deleting player ${id} and removing all references...`);
    } else {
      console.log(`Deleting player ${id} (no references found)...`);
    }
    
    // Remove from user collections
    if (existingPlayer.userPlayers && existingPlayer.userPlayers.length > 0) {
      await prisma.userPlayer.deleteMany({
        where: { playerId: id }
      });
      console.log(`Removed ${existingPlayer.userPlayers.length} user player references`);
    }

    // Remove from team lineups  
    if (existingPlayer.teamPlayers && existingPlayer.teamPlayers.length > 0) {
      await prisma.teamPlayer.deleteMany({
        where: { playerId: id }
      });
      console.log(`Removed ${existingPlayer.teamPlayers.length} team player references`);
    }

    // Remove from pack assignments
    if (existingPlayer.packPlayers && existingPlayer.packPlayers.length > 0) {
      await prisma.packPlayer.deleteMany({
        where: { playerId: id }
      });
      console.log(`Removed ${existingPlayer.packPlayers.length} pack player references`);
    }

    // Now delete the player
    await prisma.player.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Player deleted successfully',
      data: { id }
    });
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete player',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get players by filters (position, color, theme, etc.)
export const getPlayersByFilter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      position, 
      color, 
      theme, 
      minPoints, 
      maxPoints, 
      minPrice, 
      maxPrice,
      available 
    } = req.query;

    const where: any = {};

    if (position) where.position = position;
    if (color) where.color = (color as string).toUpperCase();
    if (theme) where.theme = theme;
    if (minPoints) where.points = { ...where.points, gte: parseInt(minPoints as string) };
    if (maxPoints) where.points = { ...where.points, lte: parseInt(maxPoints as string) };
    if (minPrice) where.marketPrice = { ...where.marketPrice, gte: parseInt(minPrice as string) };
    if (maxPrice) where.marketPrice = { ...where.marketPrice, lte: parseInt(maxPrice as string) };

    const players = await prisma.player.findMany({
      where,
      orderBy: [
        { points: 'desc' },
        { name: 'asc' }
      ],
      include: available === 'true' ? {
        packPlayers: {
          include: {
            pack: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      } : undefined
    });

    // Filter out players not available in any active pack if requested
    const filteredPlayers = available === 'true' 
      ? players.filter(player => 
          player.packPlayers?.some(pp => pp.pack.status === 'ACTIVE')
        )
      : players;

    res.json({
      success: true,
      data: filteredPlayers,
      count: filteredPlayers.length,
      filters: {
        position,
        color,
        theme,
        minPoints,
        maxPoints,
        minPrice,
        maxPrice,
        available
      }
    });
  } catch (error) {
    console.error('Error filtering players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to filter players',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get user's player collection
export const getUserCollection = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
        message: 'You must be logged in to view your collection'
      });
      return;
    }

    const userPlayers = await prisma.userPlayer.findMany({
      where: { userId },
      include: {
        player: true
      },
      orderBy: {
        acquiredAt: 'desc'
      }
    });

    // Transform data to match frontend interface
    const collection = userPlayers.map(up => ({
      id: up.id,
      playerId: up.playerId,
      acquiredAt: up.acquiredAt.toISOString(),
      player: up.player
    }));

    res.json({
      success: true,
      data: collection,
      count: collection.length
    });
  } catch (error) {
    console.error('Error fetching user collection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch collection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};