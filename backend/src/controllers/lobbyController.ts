import { Request, Response } from 'express';
import { prisma } from '../db/connection';

export const getAllLobbies = async (req: Request, res: Response): Promise<Response> => {
  try {
    const lobbies = await prisma.lobby.findMany({
      where: {
        status: 'WAITING',
        isActive: true
      },
      include: {
        admin: {
          select: {
            id: true,
            username: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedLobbies = lobbies.map(lobby => ({
      id: lobby.id,
      name: lobby.name,
      maxPlayers: lobby.maxPlayers,
      currentPlayers: lobby.members.length,
      status: lobby.status,
      adminId: lobby.adminId,
      admin: {
        id: lobby.admin.id,
        username: lobby.admin.username
      },
      isActive: lobby.isActive,
      currentMatchDay: lobby.currentMatchDay,
      createdAt: lobby.createdAt,
      members: lobby.members.map(member => ({
        userId: member.userId,
        username: member.user.username,
        joinedAt: member.joinedAt
      }))
    }));

    return res.json({
      success: true,
      data: formattedLobbies
    });
  } catch (error) {
    console.error('Error fetching lobbies:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch lobbies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getLobbyById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const lobby = await prisma.lobby.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            username: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    if (!lobby) {
      return res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
    }

    const formattedLobby = {
      id: lobby.id,
      name: lobby.name,
      maxPlayers: lobby.maxPlayers,
      currentPlayers: lobby.members.length,
      status: lobby.status,
      adminId: lobby.adminId,
      admin: {
        id: lobby.admin.id,
        username: lobby.admin.username
      },
      isActive: lobby.isActive,
      currentMatchDay: lobby.currentMatchDay,
      createdAt: lobby.createdAt,
      members: lobby.members.map(member => ({
        userId: member.userId,
        username: member.user.username,
        joinedAt: member.joinedAt
      }))
    };

    return res.json({
      success: true,
      data: formattedLobby
    });
  } catch (error) {
    console.error('Error fetching lobby:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch lobby',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createLobby = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name } = req.body;
    const userId = req.user!.id;

    // Additional validation (Joi validation happens in middleware, but double-check for safety)
    const trimmedName = name?.trim();
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: 'Lobby name is required and cannot be empty'
      });
    }

    // Check if user is already in a lobby
    const existingMembership = await prisma.lobbyMember.findFirst({
      where: {
        userId,
        lobby: {
          status: {
            in: ['WAITING', 'IN_PROGRESS']
          }
        }
      }
    });

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        error: 'You are already in an active lobby'
      });
    }

    // Create lobby and add user as first member in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const lobby = await tx.lobby.create({
        data: {
          name: trimmedName,
          maxPlayers: 4,
          status: 'WAITING',
          adminId: userId,
          isActive: true,
          currentMatchDay: 1
        }
      });

      await tx.lobbyMember.create({
        data: {
          lobbyId: lobby.id,
          userId
        }
      });

      return lobby;
    });

    // Fetch the complete lobby data
    const createdLobby = await prisma.lobby.findUnique({
      where: { id: result.id },
      include: {
        admin: {
          select: {
            id: true,
            username: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    const formattedLobby = {
      id: createdLobby!.id,
      name: createdLobby!.name,
      maxPlayers: createdLobby!.maxPlayers,
      currentPlayers: createdLobby!.members.length,
      status: createdLobby!.status,
      adminId: createdLobby!.adminId,
      admin: {
        id: createdLobby!.admin.id,
        username: createdLobby!.admin.username
      },
      isActive: createdLobby!.isActive,
      currentMatchDay: createdLobby!.currentMatchDay,
      createdAt: createdLobby!.createdAt,
      members: createdLobby!.members.map(member => ({
        userId: member.userId,
        username: member.user.username,
        joinedAt: member.joinedAt
      }))
    };

    return res.status(201).json({
      success: true,
      data: formattedLobby,
      message: 'Lobby created successfully'
    });
  } catch (error) {
    console.error('Error creating lobby:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create lobby',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const joinLobby = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if user is already in a lobby
    const existingMembership = await prisma.lobbyMember.findFirst({
      where: {
        userId,
        lobby: {
          status: {
            in: ['WAITING', 'IN_PROGRESS']
          }
        }
      }
    });

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        error: 'You are already in an active lobby'
      });
    }

    // Get lobby with current members
    const lobby = await prisma.lobby.findUnique({
      where: { id },
      include: {
        members: true
      }
    });

    if (!lobby) {
      return res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
    }

    if (lobby.status !== 'WAITING') {
      return res.status(400).json({
        success: false,
        error: 'Lobby is not accepting new members'
      });
    }

    if (lobby.members.length >= lobby.maxPlayers) {
      return res.status(400).json({
        success: false,
        error: 'Lobby is full'
      });
    }

    // Check if user is already in this lobby
    const alreadyMember = lobby.members.some(member => member.userId === userId);
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        error: 'You are already a member of this lobby'
      });
    }

    // Add user to lobby and potentially update status in a race-condition-safe transaction
    await prisma.$transaction(async (tx) => {
      // Re-check lobby state within transaction to avoid race conditions
      const currentLobby = await tx.lobby.findUnique({
        where: { id },
        include: { members: true }
      });

      if (!currentLobby) {
        throw new Error('Lobby not found');
      }

      if (currentLobby.status !== 'WAITING') {
        throw new Error('Lobby is not accepting new members');
      }

      if (currentLobby.members.length >= currentLobby.maxPlayers) {
        throw new Error('Lobby is full');
      }

      // Check if user is already in this lobby (race condition check)
      const alreadyMember = currentLobby.members.some(member => member.userId === userId);
      if (alreadyMember) {
        throw new Error('You are already a member of this lobby');
      }

      await tx.lobbyMember.create({
        data: {
          lobbyId: id as string,
          userId
        }
      });

      // Keep lobby in WAITING status for continuous operation
      // Admin will manage when to start matchdays manually or via scheduling
    });

    // Fetch updated lobby data
    const updatedLobby = await prisma.lobby.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            username: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    const formattedLobby = {
      id: updatedLobby!.id,
      name: updatedLobby!.name,
      maxPlayers: updatedLobby!.maxPlayers,
      currentPlayers: updatedLobby!.members.length,
      status: updatedLobby!.status,
      adminId: updatedLobby!.adminId,
      admin: {
        id: updatedLobby!.admin.id,
        username: updatedLobby!.admin.username
      },
      isActive: updatedLobby!.isActive,
      currentMatchDay: updatedLobby!.currentMatchDay,
      createdAt: updatedLobby!.createdAt,
      members: updatedLobby!.members.map(member => ({
        userId: member.userId,
        username: member.user.username,
        joinedAt: member.joinedAt
      }))
    };

    return res.json({
      success: true,
      data: formattedLobby,
      message: 'Joined lobby successfully'
    });
  } catch (error) {
    console.error('Error joining lobby:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to join lobby',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const leaveLobby = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if user is in this lobby
    const membership = await prisma.lobbyMember.findFirst({
      where: {
        lobbyId: id,
        userId
      },
      include: {
        lobby: {
          include: {
            members: true
          }
        }
      }
    });

    if (!membership) {
      return res.status(400).json({
        success: false,
        error: 'You are not a member of this lobby'
      });
    }

    const lobby = membership.lobby;

    if (lobby.status === 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        error: 'Cannot leave lobby while game is in progress'
      });
    }

    // Remove user from lobby with race-condition-safe transaction
    await prisma.$transaction(async (tx) => {
      // Re-check membership within transaction
      const currentMembership = await tx.lobbyMember.findFirst({
        where: {
          lobbyId: id,
          userId
        },
        include: {
          lobby: {
            include: {
              members: true
            }
          }
        }
      });

      if (!currentMembership) {
        throw new Error('You are not a member of this lobby');
      }

      const currentLobby = currentMembership.lobby;

      if (currentLobby.status === 'IN_PROGRESS') {
        throw new Error('Cannot leave lobby while game is in progress');
      }

      await tx.lobbyMember.delete({
        where: {
          id: currentMembership.id
        }
      });

      // If this was the last member, delete the lobby
      if (currentLobby.members.length === 1) {
        await tx.lobby.delete({
          where: { id }
        });
      } else {
        // If lobby was IN_PROGRESS and now has less than 4 players, set back to WAITING
        if (currentLobby.status === 'IN_PROGRESS' && currentLobby.members.length - 1 < currentLobby.maxPlayers) {
          await tx.lobby.update({
            where: { id },
            data: { status: 'WAITING' }
          });
        }
      }
    });

    return res.json({
      success: true,
      message: 'Left lobby successfully'
    });
  } catch (error) {
    console.error('Error leaving lobby:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to leave lobby',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Schedule the next matchday for a lobby (admin only)
 */
export const scheduleNextMatchDay = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = req.params.id!;
    const userId = req.user!.id;
    const { scheduledAt } = req.body;

    // Check if user is lobby admin
    const lobby = await prisma.lobby.findUnique({
      where: { id },
      select: {
        id: true,
        adminId: true,
        currentMatchDay: true,
        isActive: true
      }
    });

    if (!lobby) {
      return res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
    }

    if (lobby.adminId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the lobby admin can schedule matchdays'
      });
    }

    if (!lobby.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot schedule matchdays for inactive lobby'
      });
    }

    const nextMatchDay = lobby.currentMatchDay + 1;
    const scheduledDate = new Date(scheduledAt);

    // Validate scheduled date
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Scheduled time must be in the future'
      });
    }

    // Create scheduled matchday
    const scheduledMatchDay = await prisma.scheduledMatchDay.create({
      data: {
        lobbyId: id,
        matchDay: nextMatchDay,
        scheduledAt: scheduledDate
      }
    });

    // Update lobby's next matchday time
    await prisma.lobby.update({
      where: { id },
      data: {
        nextMatchDay: scheduledDate
      }
    });

    return res.json({
      success: true,
      message: `Matchday ${nextMatchDay} scheduled successfully`,
      data: {
        matchDay: nextMatchDay,
        scheduledAt: scheduledDate,
        scheduledMatchDayId: scheduledMatchDay.id
      }
    });
  } catch (error) {
    console.error('Error scheduling matchday:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to schedule matchday',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};