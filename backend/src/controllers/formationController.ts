import { Request, Response } from 'express';
import { prisma } from '../db/client';

/**
 * Formation Controller
 * Handles CRUD operations for football formations
 */

interface FormationPosition {
  position: string;
  x: number;
  y: number;
}

// Default coordinate mapping for positions (4-4-2 formation layout)
const getDefaultCoordinates = (position: string, index: number): { x: number; y: number } => {
  const defaults: Record<string, { x: number; y: number }> = {
    'GK': { x: 50, y: 10 },
    'LB': { x: 20, y: 25 },
    'CB': { x: 40, y: 25 },
    'RB': { x: 80, y: 25 },
    'CDM': { x: 50, y: 40 },
    'CM': { x: 50, y: 50 },
    'CAM': { x: 50, y: 60 },
    'LM': { x: 20, y: 50 },
    'RM': { x: 80, y: 50 },
    'LW': { x: 20, y: 75 },
    'RW': { x: 80, y: 75 },
    'ST': { x: 50, y: 75 },
    'CF': { x: 50, y: 70 },
    'LF': { x: 40, y: 75 },
    'RF': { x: 60, y: 75 }
  };

  // If position has default coordinates, use them
  if (defaults[position]) {
    return defaults[position];
  }

  // For multiple same positions (like CB, CM, ST), adjust x coordinate
  const baseCoord = defaults[position] || { x: 50, y: 50 };
  const offset = (index % 3 - 1) * 20; // -20, 0, +20 for multiple positions
  return {
    x: Math.max(10, Math.min(90, baseCoord.x + offset)),
    y: baseCoord.y
  };
};

// Transform position data to ensure proper format
const transformPositions = (positions: any[]): FormationPosition[] => {
  return positions.map((pos, index) => {
    // If it's already a proper FormationPosition object, return as is
    if (typeof pos === 'object' && pos.position && typeof pos.x === 'number' && typeof pos.y === 'number') {
      return pos as FormationPosition;
    }
    
    // If it's a string (legacy format), convert to FormationPosition
    if (typeof pos === 'string') {
      const coords = getDefaultCoordinates(pos, index);
      return {
        position: pos,
        x: coords.x,
        y: coords.y
      };
    }
    
    // If it's an object but missing coordinates, add them
    if (typeof pos === 'object' && pos.position) {
      const coords = getDefaultCoordinates(pos.position, index);
      return {
        position: pos.position,
        x: pos.x || coords.x,
        y: pos.y || coords.y
      };
    }
    
    // Fallback for invalid data
    return {
      position: 'ST',
      x: 50,
      y: 75
    };
  });
};

// Get all formations
export const getAllFormations = async (req: Request, res: Response): Promise<void> => {
  try {
    const formations = await prisma.formation.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Parse positions JSON string for each formation and transform to proper format
    const formationsWithParsedPositions = formations.map(formation => {
      let positions: FormationPosition[];
      try {
        const parsedPositions = JSON.parse(formation.positions);
        positions = transformPositions(parsedPositions);
      } catch (parseError) {
        console.error('Error parsing formation positions:', parseError);
        positions = [];
      }
      
      return {
        ...formation,
        positions
      };
    });

    res.json({
      success: true,
      data: formationsWithParsedPositions,
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

    // Parse positions JSON string and transform to proper format
    let positions: FormationPosition[];
    try {
      const parsedPositions = JSON.parse(formation.positions);
      positions = transformPositions(parsedPositions);
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
    const { name, positions, percentage } = req.body;
    
    // Default imageUrl (images are not required for formations)
    const imageUrl = '/images/formations/default.jpg';

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
        positions: JSON.stringify(positions),
        percentage: percentage || 0.05 // Default 5%
      }
    });

    res.status(201).json({
      success: true,
      message: 'Formation created successfully',
      data: {
        ...formation,
        positions: transformPositions(positions)
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
    const { name, positions, percentage } = req.body;

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
    if (percentage !== undefined) updateData.percentage = percentage;
    
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

    // Parse positions for response and transform to proper format
    let parsedPositions: FormationPosition[];
    try {
      const rawPositions = JSON.parse(updatedFormation.positions);
      parsedPositions = transformPositions(rawPositions);
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