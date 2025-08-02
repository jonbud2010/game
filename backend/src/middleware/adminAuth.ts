import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/connection';
import type { AuthenticatedRequest } from './auth';

export interface LobbyAdminRequest extends AuthenticatedRequest {
  lobby?: {
    id: string;
    name: string;
    adminId: string;
    isActive: boolean;
    currentMatchDay: number;
  };
}

/**
 * Middleware to check if the authenticated user is the admin of a specific lobby
 * Requires the lobbyId to be present in req.params.lobbyId
 */
export const requireLobbyAdmin = async (
  req: LobbyAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const lobbyId = req.params.lobbyId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!lobbyId) {
      res.status(400).json({
        success: false,
        error: 'Lobby ID is required'
      });
      return;
    }

    // Check if lobby exists and user is the admin
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      select: {
        id: true,
        name: true,
        adminId: true,
        isActive: true,
        currentMatchDay: true
      }
    });

    if (!lobby) {
      res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
      return;
    }

    if (lobby.adminId !== userId) {
      res.status(403).json({
        success: false,
        error: 'You are not the admin of this lobby',
        details: 'Only the lobby admin can perform this action'
      });
      return;
    }

    if (!lobby.isActive) {
      res.status(400).json({
        success: false,
        error: 'Lobby is not active',
        details: 'This lobby has been deactivated'
      });
      return;
    }

    // Attach lobby info to request for use in controllers
    req.lobby = lobby;
    next();
  } catch (error) {
    console.error('Error in lobby admin middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Middleware to check if the authenticated user is a member of a specific lobby
 * Less restrictive than admin check - any lobby member can access
 */
export const requireLobbyMember = async (
  req: LobbyAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const lobbyId = req.params.lobbyId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!lobbyId) {
      res.status(400).json({
        success: false,
        error: 'Lobby ID is required'
      });
      return;
    }

    // Check if lobby exists and user is a member
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        members: {
          where: { userId },
          select: { userId: true }
        }
      },
      select: {
        id: true,
        name: true,
        adminId: true,
        isActive: true,
        currentMatchDay: true,
        members: true
      }
    });

    if (!lobby) {
      res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
      return;
    }

    const isMember = lobby.members.length > 0;
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: 'You are not a member of this lobby',
        details: 'Only lobby members can access this resource'
      });
      return;
    }

    if (!lobby.isActive) {
      res.status(400).json({
        success: false,
        error: 'Lobby is not active',
        details: 'This lobby has been deactivated'
      });
      return;
    }

    // Attach lobby info to request for use in controllers
    req.lobby = {
      id: lobby.id,
      name: lobby.name,
      adminId: lobby.adminId,
      isActive: lobby.isActive,
      currentMatchDay: lobby.currentMatchDay
    };
    next();
  } catch (error) {
    console.error('Error in lobby member middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Middleware to check if the authenticated user is either the lobby admin or a global admin
 * Useful for operations that should be allowed by both lobby admins and system admins
 */
export const requireLobbyAdminOrGlobalAdmin = async (
  req: LobbyAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const lobbyId = req.params.lobbyId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // If user is global admin, allow access without lobby checks
    if (userRole === 'ADMIN') {
      if (lobbyId) {
        const lobby = await prisma.lobby.findUnique({
          where: { id: lobbyId },
          select: {
            id: true,
            name: true,
            adminId: true,
            isActive: true,
            currentMatchDay: true
          }
        });

        if (lobby) {
          req.lobby = lobby;
        }
      }
      next();
      return;
    }

    // Otherwise, check lobby admin permissions
    await requireLobbyAdmin(req, res, next);
  } catch (error) {
    console.error('Error in lobby admin or global admin middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};