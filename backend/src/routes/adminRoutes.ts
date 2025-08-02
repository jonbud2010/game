import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireLobbyAdmin, requireLobbyMember } from '../middleware/adminAuth';
import {
  createLobbyPlayer,
  getLobbyPlayers,
  updateLobbyPlayer,
  deleteLobbyPlayer,
  createLobbyPack,
  getLobbyPacks,
  createLobbyFormation,
  getLobbyFormations
} from '../controllers/adminController';
import { scheduleNextMatchDay } from '../controllers/lobbyController';

const router = Router();

/**
 * Admin Routes for Lobby Management
 * All routes require authentication and appropriate lobby permissions
 */

// ===============================
// LOBBY PLAYER MANAGEMENT
// ===============================

/**
 * GET /api/admin/lobbies/:lobbyId/players
 * Get all players in a lobby (lobby members can view, admin can manage)
 */
router.get('/lobbies/:lobbyId/players', authenticateToken, requireLobbyMember, getLobbyPlayers);

/**
 * POST /api/admin/lobbies/:lobbyId/players
 * Create a new player in the lobby (admin only)
 */
router.post('/lobbies/:lobbyId/players', authenticateToken, requireLobbyAdmin, createLobbyPlayer);

/**
 * PUT /api/admin/lobbies/:lobbyId/players/:playerId
 * Update a player in the lobby (admin only)
 */
router.put('/lobbies/:lobbyId/players/:playerId', authenticateToken, requireLobbyAdmin, updateLobbyPlayer);

/**
 * DELETE /api/admin/lobbies/:lobbyId/players/:playerId
 * Remove a player from the lobby (admin only)
 */
router.delete('/lobbies/:lobbyId/players/:playerId', authenticateToken, requireLobbyAdmin, deleteLobbyPlayer);

// ===============================
// LOBBY PACK MANAGEMENT
// ===============================

/**
 * GET /api/admin/lobbies/:lobbyId/packs
 * Get all packs in a lobby (lobby members can view, admin can manage)
 */
router.get('/lobbies/:lobbyId/packs', authenticateToken, requireLobbyMember, getLobbyPacks);

/**
 * POST /api/admin/lobbies/:lobbyId/packs
 * Create a new pack in the lobby (admin only)
 */
router.post('/lobbies/:lobbyId/packs', authenticateToken, requireLobbyAdmin, createLobbyPack);

// ===============================
// LOBBY FORMATION MANAGEMENT
// ===============================

/**
 * GET /api/admin/lobbies/:lobbyId/formations
 * Get all formations in a lobby (lobby members can view, admin can manage)
 */
router.get('/lobbies/:lobbyId/formations', authenticateToken, requireLobbyMember, getLobbyFormations);

/**
 * POST /api/admin/lobbies/:lobbyId/formations
 * Create a new formation in the lobby (admin only)
 */
router.post('/lobbies/:lobbyId/formations', authenticateToken, requireLobbyAdmin, createLobbyFormation);

// ===============================
// MATCHDAY SCHEDULING
// ===============================

/**
 * POST /api/admin/lobbies/:lobbyId/schedule-matchday
 * Schedule the next matchday for the lobby (admin only)
 */
router.post('/lobbies/:lobbyId/schedule-matchday', authenticateToken, requireLobbyAdmin, scheduleNextMatchDay);

// ===============================
// ADMIN PERMISSIONS CHECK
// ===============================

/**
 * GET /api/admin/lobbies/:lobbyId/permissions
 * Check user's admin permissions for a specific lobby
 */
router.get('/lobbies/:lobbyId/permissions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { lobbyId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user is lobby admin
    const { prisma } = await import('../db/connection');
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      select: {
        adminId: true,
        isActive: true
      }
    });

    if (!lobby) {
      return res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
    }

    const isAdmin = lobby.adminId === userId;
    const isActive = lobby.isActive;

    return res.json({
      success: true,
      data: {
        isAdmin,
        isActive,
        permissions: {
          canCreatePlayers: isAdmin && isActive,
          canCreatePacks: isAdmin && isActive,
          canCreateFormations: isAdmin && isActive,
          canScheduleMatchDays: isAdmin && isActive,
          canManageMembers: isAdmin && isActive
        }
      }
    });
  } catch (error) {
    console.error('Error checking admin permissions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check permissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;