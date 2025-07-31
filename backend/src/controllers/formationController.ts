import { Request, Response } from 'express';
import { prisma } from '../db/client';

/**
 * Formation Controller
 * Handles CRUD operations for football formations
 */

// Get all formations
export const getAllFormations = async (req: Request, res: Response): Promise<void> => {
  try {
    const formations = await prisma.formation.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: formations,
      count: formations.length
    });
  } catch (error) {
    console.error('Error fetching formations:', error);
    res.status(500).json({
      error: 'Failed to fetch formations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get formation by ID
export const getFormationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const formation = await prisma.formation.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
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
        }
      }
    });

    if (!formation) {
      res.status(404).json({
        error: 'Formation not found',
        message: `No formation found with ID: ${id}`
      });
      return;
    }

    // Parse positions JSON string
    let positions;
    try {
      positions = JSON.parse(formation.positions);
    } catch (parseError) {
      console.error('Error parsing formation positions:', parseError);
      positions = [];
    }

    res.json({
      success: true,
      data: {
        ...formation,
        positions
      }
    });
  } catch (error) {
    console.error('Error fetching formation:', error);
    res.status(500).json({
      error: 'Failed to fetch formation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new formation
export const createFormation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, positions } = req.body;
    
    // Default imageUrl if not provided (will be updated via file upload)
    const imageUrl = req.body.imageUrl || '/images/formations/default.jpg';

    // Validate positions structure
    if (!Array.isArray(positions) || positions.length !== 11) {
      res.status(400).json({
        error: 'Invalid positions',
        message: 'Formation must have exactly 11 positions'
      });
      return;
    }

    // Validate each position has required fields
    const validPositions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'LF', 'RF'];
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (!pos.position || !validPositions.includes(pos.position)) {
        res.status(400).json({
          error: 'Invalid position',
          message: `Position at index ${i} has invalid position type: ${pos.position}`
        });
        return;
      }
      if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
        res.status(400).json({
          error: 'Invalid coordinates',
          message: `Position at index ${i} must have numeric x and y coordinates`
        });
        return;
      }
    }

    const formation = await prisma.formation.create({
      data: {
        name,
        imageUrl,
        positions: JSON.stringify(positions)
      }
    });

    res.status(201).json({
      success: true,
      message: 'Formation created successfully',
      data: {
        ...formation,
        positions
      }
    });
  } catch (error) {
    console.error('Error creating formation:', error);
    
    // Handle unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      res.status(400).json({
        error: 'Formation already exists',
        message: 'A formation with this name already exists'
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to create formation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update formation
export const updateFormation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, imageUrl, positions } = req.body;

    // Check if formation exists
    const existingFormation = await prisma.formation.findUnique({
      where: { id }
    });

    if (!existingFormation) {
      res.status(404).json({
        error: 'Formation not found',
        message: `No formation found with ID: ${id}`
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    
    if (positions !== undefined) {
      // Validate positions if provided
      if (!Array.isArray(positions) || positions.length !== 11) {
        res.status(400).json({
          error: 'Invalid positions',
          message: 'Formation must have exactly 11 positions'
        });
        return;
      }

      // Validate each position
      const validPositions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'LF', 'RF'];
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        if (!pos.position || !validPositions.includes(pos.position)) {
          res.status(400).json({
            error: 'Invalid position',
            message: `Position at index ${i} has invalid position type: ${pos.position}`
          });
          return;
        }
        if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
          res.status(400).json({
            error: 'Invalid coordinates',
            message: `Position at index ${i} must have numeric x and y coordinates`
          });
          return;
        }
      }

      updateData.positions = JSON.stringify(positions);
    }

    const updatedFormation = await prisma.formation.update({
      where: { id },
      data: updateData
    });

    // Parse positions for response
    let parsedPositions;
    try {
      parsedPositions = JSON.parse(updatedFormation.positions);
    } catch (parseError) {
      parsedPositions = [];
    }

    res.json({
      success: true,
      message: 'Formation updated successfully',
      data: {
        ...updatedFormation,
        positions: parsedPositions
      }
    });
  } catch (error) {
    console.error('Error updating formation:', error);
    
    // Handle unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      res.status(400).json({
        error: 'Update conflict',
        message: 'A formation with this name already exists'
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to update formation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete formation
export const deleteFormation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if formation exists
    const existingFormation = await prisma.formation.findUnique({
      where: { id },
      include: {
        teams: true
      }
    });

    if (!existingFormation) {
      res.status(404).json({
        error: 'Formation not found',
        message: `No formation found with ID: ${id}`
      });
      return;
    }

    // Check if formation is in use
    if (existingFormation.teams.length > 0) {
      res.status(400).json({
        error: 'Cannot delete formation',
        message: 'Formation is currently in use by teams',
        details: {
          usedByTeams: existingFormation.teams.length
        }
      });
      return;
    }

    await prisma.formation.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Formation deleted successfully',
      data: { id }
    });
  } catch (error) {
    console.error('Error deleting formation:', error);
    res.status(500).json({
      error: 'Failed to delete formation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get formation statistics
export const getFormationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const formations = await prisma.formation.findMany({
      include: {
        teams: {
          include: {
            user: {
              select: {
                username: true
              }
            }
          }
        }
      }
    });

    const stats = formations.map(formation => {
      let positions;
      try {
        positions = JSON.parse(formation.positions);
      } catch {
        positions = [];
      }

      return {
        id: formation.id,
        name: formation.name,
        imageUrl: formation.imageUrl,
        positionCount: positions.length,
        teamsUsing: formation.teams.length,
        users: formation.teams.map(team => team.user.username),
        createdAt: formation.createdAt
      };
    });

    res.json({
      success: true,
      data: stats,
      totalFormations: formations.length
    });
  } catch (error) {
    console.error('Error fetching formation stats:', error);
    res.status(500).json({
      error: 'Failed to fetch formation statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};