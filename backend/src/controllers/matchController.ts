import { Request, Response } from 'express';
import { prisma } from '../db/client';
import { 
  simulateCompleteMatch, 
  simulateLeague, 
  generateLeagueMatches,
  calculateTeamStrength,
  type TeamWithPlayers 
} from '@football-tcg/shared';
import { LEAGUE_REWARDS } from '@football-tcg/shared';

/**
 * Match Controller
 * Handles match simulation, league management, and game logic
 */

// Get all matches for a lobby
export const getLobbyMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lobbyId } = req.params;

    const matches = await prisma.match.findMany({
      where: { lobbyId },
      include: {
        homeTeam: {
          include: {
            user: {
              select: { id: true, username: true }
            },
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
        },
        awayTeam: {
          include: {
            user: {
              select: { id: true, username: true }
            },
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
        },
        lobby: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { matchDay: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: matches,
      count: matches.length
    });
  } catch (error) {
    console.error('Error fetching lobby matches:', error);
    res.status(500).json({
      error: 'Failed to fetch matches',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get match by ID
export const getMatchById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: {
          include: {
            user: {
              select: { id: true, username: true }
            },
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
        },
        awayTeam: {
          include: {
            user: {
              select: { id: true, username: true }
            },
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
        },
        lobby: {
          select: { id: true, name: true }
        }
      }
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({
      error: 'Failed to fetch match',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Generate matches for a matchday
export const generateMatchdayMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lobbyId } = req.params;
    const { matchDay } = req.body;

    if (!matchDay || matchDay < 1) {
      res.status(400).json({ error: 'Valid matchDay is required' });
      return;
    }

    // Check if lobby exists and has 4 players
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        members: true
      }
    });

    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    if (lobby.members.length !== 4) {
      res.status(400).json({ error: 'Lobby must have exactly 4 players to generate matches' });
      return;
    }

    // Check if matches already exist for this matchday
    const existingMatches = await prisma.match.findMany({
      where: {
        lobbyId,
        matchDay
      }
    });

    if (existingMatches.length > 0) {
      res.status(409).json({ error: 'Matches already exist for this matchday' });
      return;
    }

    // Get all teams for this matchday
    const teams = await prisma.team.findMany({
      where: {
        lobbyId,
        matchDay
      },
      include: {
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

    if (teams.length !== 4) {
      res.status(400).json({ 
        error: 'All 4 players must have teams created for this matchday',
        teamsFound: teams.length 
      });
      return;
    }

    // Transform teams to match engine format
    const teamsWithPlayers: TeamWithPlayers[] = teams.map(team => ({
      id: team.id,
      name: team.name,
      userId: team.userId,
      formationId: team.formationId,
      players: team.teamPlayers.map(tp => ({
        ...tp.player,
        position: tp.player.position as any // Type assertion for position compatibility
      })),
      totalPoints: 0,
      chemistryPoints: 0
    }));

    // Generate match pairings
    const matchPairings = generateLeagueMatches(teamsWithPlayers);

    // Create matches in database
    const createdMatches = await Promise.all(
      matchPairings.map(pairing =>
        prisma.match.create({
          data: {
            lobbyId: lobbyId!,
            homeTeamId: pairing.homeTeam.id,
            awayTeamId: pairing.awayTeam.id,
            matchDay,
            homeScore: 0,
            awayScore: 0,
            played: false
          },
          include: {
            homeTeam: {
              include: {
                user: { select: { id: true, username: true } }
              }
            },
            awayTeam: {
              include: {
                user: { select: { id: true, username: true } }
              }
            }
          }
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `Generated ${createdMatches.length} matches for matchday ${matchDay}`,
      data: createdMatches
    });
  } catch (error) {
    console.error('Error generating matches:', error);
    res.status(500).json({
      error: 'Failed to generate matches',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Simulate a single match
export const simulateMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: {
          include: {
            teamPlayers: {
              include: {
                player: true
              },
              orderBy: {
                position: 'asc'
              }
            }
          }
        },
        awayTeam: {
          include: {
            teamPlayers: {
              include: {
                player: true
              },
              orderBy: {
                position: 'asc'
              }
            }
          }
        },
        lobby: {
          include: {
            members: true
          }
        }
      }
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    // Check if user is member of the lobby
    const isMember = match.lobby.members.some(member => member.userId === userId);
    if (!isMember) {
      res.status(403).json({ error: 'User is not a member of this lobby' });
      return;
    }

    if (match.played) {
      res.status(400).json({ error: 'Match has already been played' });
      return;
    }

    // Transform teams to match engine format
    const homeTeam: TeamWithPlayers = {
      id: match.homeTeam.id,
      name: match.homeTeam.name,
      userId: match.homeTeam.userId,
      formationId: match.homeTeam.formationId,
      players: match.homeTeam.teamPlayers.map(tp => tp.player),
      totalPoints: 0,
      chemistryPoints: 0
    };

    const awayTeam: TeamWithPlayers = {
      id: match.awayTeam.id,
      name: match.awayTeam.name,
      userId: match.awayTeam.userId,
      formationId: match.awayTeam.formationId,
      players: match.awayTeam.teamPlayers.map(tp => tp.player),
      totalPoints: 0,
      chemistryPoints: 0
    };

    // Simulate the match
    const simulationResult = simulateCompleteMatch(homeTeam, awayTeam);

    // Update match in database
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        homeScore: simulationResult.result.homeScore,
        awayScore: simulationResult.result.awayScore,
        played: true,
        playedAt: new Date()
      },
      include: {
        homeTeam: {
          include: {
            user: { select: { id: true, username: true } }
          }
        },
        awayTeam: {
          include: {
            user: { select: { id: true, username: true } }
          }
        }
      }
    });

    // Update league table
    await updateLeagueTable(match.lobbyId, match.matchDay, simulationResult.result);

    res.json({
      success: true,
      message: 'Match simulated successfully',
      data: {
        match: updatedMatch,
        simulation: simulationResult.simulation,
        homeStrength: simulationResult.homeStrength,
        awayStrength: simulationResult.awayStrength
      }
    });
  } catch (error) {
    console.error('Error simulating match:', error);
    res.status(500).json({
      error: 'Failed to simulate match',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Simulate all matches for a matchday
export const simulateMatchday = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lobbyId } = req.params;
    const { matchDay } = req.body;
    const userId = req.user?.id;

    if (!matchDay || matchDay < 1) {
      res.status(400).json({ error: 'Valid matchDay is required' });
      return;
    }

    // Check if user is member of the lobby
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        members: true
      }
    });

    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    const isMember = lobby.members.some(member => member.userId === userId);
    if (!isMember) {
      res.status(403).json({ error: 'User is not a member of this lobby' });
      return;
    }

    // Get unplayed matches for this matchday
    const matches = await prisma.match.findMany({
      where: {
        lobbyId,
        matchDay,
        played: false
      },
      include: {
        homeTeam: {
          include: {
            teamPlayers: {
              include: {
                player: true
              },
              orderBy: {
                position: 'asc'
              }
            }
          }
        },
        awayTeam: {
          include: {
            teamPlayers: {
              include: {
                player: true
              },
              orderBy: {
                position: 'asc'
              }
            }
          }
        }
      }
    });

    if (matches.length === 0) {
      res.status(400).json({ error: 'No unplayed matches found for this matchday' });
      return;
    }

    const results = [];

    // Simulate each match
    for (const match of matches) {
      const homeTeam: TeamWithPlayers = {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        userId: match.homeTeam.userId,
        formationId: match.homeTeam.formationId,
        players: match.homeTeam.teamPlayers.map(tp => tp.player),
        totalPoints: 0,
        chemistryPoints: 0
      };

      const awayTeam: TeamWithPlayers = {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        userId: match.awayTeam.userId,
        formationId: match.awayTeam.formationId,
        players: match.awayTeam.teamPlayers.map(tp => tp.player),
        totalPoints: 0,
        chemistryPoints: 0
      };

      const simulationResult = simulateCompleteMatch(homeTeam, awayTeam);

      // Update match
      await prisma.match.update({
        where: { id: match.id },
        data: {
          homeScore: simulationResult.result.homeScore,
          awayScore: simulationResult.result.awayScore,
          played: true,
          playedAt: new Date()
        }
      });

      // Update league table
      await updateLeagueTable(lobbyId, match.matchDay, simulationResult.result);

      results.push({
        matchId: match.id,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        score: `${simulationResult.result.homeScore}-${simulationResult.result.awayScore}`,
        simulation: simulationResult.simulation
      });
    }

    res.json({
      success: true,
      message: `Simulated ${results.length} matches for matchday ${matchDay}`,
      data: results
    });
  } catch (error) {
    console.error('Error simulating matchday:', error);
    res.status(500).json({
      error: 'Failed to simulate matchday',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get league table for a lobby (optionally filtered by matchDay)
export const getLeagueTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lobbyId } = req.params;
    const { matchDay } = req.query;

    // Build where clause
    const whereClause: any = { lobbyId };
    if (matchDay && !isNaN(Number(matchDay))) {
      whereClause.matchDay = Number(matchDay);
    }

    const leagueTable = await prisma.leagueTable.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: [
        { matchDay: 'desc' },
        { points: 'desc' },
        { goalsFor: 'desc' },
        { goalsAgainst: 'asc' }
      ]
    });

    // Group by matchDay if no specific matchDay requested
    if (!matchDay) {
      const tablesByMatchDay = leagueTable.reduce((acc, entry) => {
        if (!acc[entry.matchDay]) {
          acc[entry.matchDay] = [];
        }
        acc[entry.matchDay].push(entry);
        return acc;
      }, {} as Record<number, typeof leagueTable>);

      // Sort each matchday's table and assign positions
      Object.keys(tablesByMatchDay).forEach(md => {
        tablesByMatchDay[Number(md)] = tablesByMatchDay[Number(md)]
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            return a.goalsAgainst - b.goalsAgainst;
          })
          .map((entry, index) => ({
            ...entry,
            position: index + 1,
            goalDifference: entry.goalsFor - entry.goalsAgainst,
            matches: entry.wins + entry.draws + entry.losses
          }));
      });

      res.json({
        success: true,
        data: tablesByMatchDay
      });
    } else {
      // Return table for specific matchDay
      const updatedTable = leagueTable
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
          return a.goalsAgainst - b.goalsAgainst;
        })
        .map((entry, index) => ({
          ...entry,
          position: index + 1,
          goalDifference: entry.goalsFor - entry.goalsAgainst,
          matches: entry.wins + entry.draws + entry.losses
        }));

      res.json({
        success: true,
        data: updatedTable,
        matchDay: Number(matchDay)
      });
    }
  } catch (error) {
    console.error('Error fetching league table:', error);
    res.status(500).json({
      error: 'Failed to fetch league table',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper function to update league table for specific matchday
async function updateLeagueTable(lobbyId: string, matchDay: number, result: any): Promise<void> {
  const { homeTeam, awayTeam, homeScore, awayScore, homePoints, awayPoints } = result;

  // Update home team stats for this matchday
  await prisma.leagueTable.upsert({
    where: {
      lobbyId_userId_matchDay: {
        lobbyId,
        userId: homeTeam.userId,
        matchDay
      }
    },
    update: {
      points: { increment: homePoints },
      goalsFor: { increment: homeScore },
      goalsAgainst: { increment: awayScore },
      wins: homePoints === 3 ? { increment: 1 } : undefined,
      draws: homePoints === 1 ? { increment: 1 } : undefined,
      losses: homePoints === 0 ? { increment: 1 } : undefined
    },
    create: {
      lobbyId,
      userId: homeTeam.userId,
      matchDay,
      points: homePoints,
      goalsFor: homeScore,
      goalsAgainst: awayScore,
      wins: homePoints === 3 ? 1 : 0,
      draws: homePoints === 1 ? 1 : 0,
      losses: homePoints === 0 ? 1 : 0,
      position: 1
    }
  });

  // Update away team stats for this matchday
  await prisma.leagueTable.upsert({
    where: {
      lobbyId_userId_matchDay: {
        lobbyId,
        userId: awayTeam.userId,
        matchDay
      }
    },
    update: {
      points: { increment: awayPoints },
      goalsFor: { increment: awayScore },
      goalsAgainst: { increment: homeScore },
      wins: awayPoints === 3 ? { increment: 1 } : undefined,
      draws: awayPoints === 1 ? { increment: 1 } : undefined,
      losses: awayPoints === 0 ? { increment: 1 } : undefined
    },
    create: {
      lobbyId,
      userId: awayTeam.userId,
      matchDay,
      points: awayPoints,
      goalsFor: awayScore,
      goalsAgainst: homeScore,
      wins: awayPoints === 3 ? 1 : 0,
      draws: awayPoints === 1 ? 1 : 0,
      losses: awayPoints === 0 ? 1 : 0,
      position: 1
    }
  });
}

// Create complete league for lobby (all 3 matchdays)
export const createLeague = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lobbyId } = req.params;
    const userId = req.user?.id;

    // Check if user is member of the lobby
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        members: true
      }
    });

    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    if (lobby.members.length !== 4) {
      res.status(400).json({ error: 'Lobby must have exactly 4 players to create league' });
      return;
    }

    const isMember = lobby.members.some(member => member.userId === userId);
    if (!isMember) {
      res.status(403).json({ error: 'User is not a member of this lobby' });
      return;
    }

    // Check if league already exists
    const existingMatches = await prisma.match.findMany({
      where: { lobbyId }
    });

    if (existingMatches.length > 0) {
      res.status(409).json({ error: 'League already exists for this lobby' });
      return;
    }

    // Generate matches for all 3 matchdays
    const allMatches = [];
    const errors = [];

    for (let matchDay = 1; matchDay <= 3; matchDay++) {
      try {
        // Get all teams for this matchday
        const teams = await prisma.team.findMany({
          where: {
            lobbyId,
            matchDay
          },
          include: {
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

        if (teams.length !== 4) {
          errors.push(`Matchday ${matchDay}: Need exactly 4 teams, found ${teams.length}`);
          continue;
        }

        // Transform teams to match engine format
        const teamsWithPlayers: TeamWithPlayers[] = teams.map(team => ({
          id: team.id,
          name: team.name,
          userId: team.userId,
          formationId: team.formationId,
          players: team.teamPlayers.map(tp => ({
        ...tp.player,
        position: tp.player.position as any
      })),
          totalPoints: 0,
          chemistryPoints: 0
        }));

        // Generate match pairings
        const matchPairings = generateLeagueMatches(teamsWithPlayers);

        // Create matches in database
        const matchdayMatches = await Promise.all(
          matchPairings.map(pairing =>
            prisma.match.create({
              data: {
                lobbyId,
                homeTeamId: pairing.homeTeam.id,
                awayTeamId: pairing.awayTeam.id,
                matchDay,
                homeScore: 0,
                awayScore: 0,
                played: false
              }
            })
          )
        );

        allMatches.push(...matchdayMatches);
      } catch (error) {
        errors.push(`Matchday ${matchDay}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ 
        error: 'Failed to create complete league',
        details: errors,
        partialMatches: allMatches.length
      });
      return;
    }

    // Update lobby status to IN_PROGRESS
    await prisma.lobby.update({
      where: { id: lobbyId },
      data: { status: 'IN_PROGRESS' }
    });

    res.status(201).json({
      success: true,
      message: `League created with ${allMatches.length} matches across 3 matchdays`,
      data: {
        totalMatches: allMatches.length,
        matchdayBreakdown: {
          matchday1: allMatches.filter(m => m.matchDay === 1).length,
          matchday2: allMatches.filter(m => m.matchDay === 2).length,
          matchday3: allMatches.filter(m => m.matchDay === 3).length
        }
      }
    });
  } catch (error) {
    console.error('Error creating league:', error);
    res.status(500).json({
      error: 'Failed to create league',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Simulate entire league (all matches across all matchdays)
export const simulateEntireLeague = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lobbyId } = req.params;
    const userId = req.user?.id;

    // Check if user is member of the lobby
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        members: true
      }
    });

    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    const isMember = lobby.members.some(member => member.userId === userId);
    if (!isMember) {
      res.status(403).json({ error: 'User is not a member of this lobby' });
      return;
    }

    // Get all unplayed matches
    const matches = await prisma.match.findMany({
      where: {
        lobbyId,
        played: false
      },
      include: {
        homeTeam: {
          include: {
            teamPlayers: {
              include: {
                player: true
              },
              orderBy: {
                position: 'asc'
              }
            }
          }
        },
        awayTeam: {
          include: {
            teamPlayers: {
              include: {
                player: true
              },
              orderBy: {
                position: 'asc'
              }
            }
          }
        }
      },
      orderBy: [
        { matchDay: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    if (matches.length === 0) {
      res.status(400).json({ error: 'No unplayed matches found' });
      return;
    }

    const results = [];

    // Simulate each match
    for (const match of matches) {
      const homeTeam: TeamWithPlayers = {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        userId: match.homeTeam.userId,
        formationId: match.homeTeam.formationId,
        players: match.homeTeam.teamPlayers.map(tp => tp.player),
        totalPoints: 0,
        chemistryPoints: 0
      };

      const awayTeam: TeamWithPlayers = {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        userId: match.awayTeam.userId,
        formationId: match.awayTeam.formationId,
        players: match.awayTeam.teamPlayers.map(tp => tp.player),
        totalPoints: 0,
        chemistryPoints: 0
      };

      const simulationResult = simulateCompleteMatch(homeTeam, awayTeam);

      // Update match
      await prisma.match.update({
        where: { id: match.id },
        data: {
          homeScore: simulationResult.result.homeScore,
          awayScore: simulationResult.result.awayScore,
          played: true,
          playedAt: new Date()
        }
      });

      // Update league table
      await updateLeagueTable(lobbyId, match.matchDay, simulationResult.result);

      results.push({
        matchId: match.id,
        matchDay: match.matchDay,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        score: `${simulationResult.result.homeScore}-${simulationResult.result.awayScore}`
      });
    }

    // Note: In continuous leagues, we don't finish the league
    // Each matchday is independent with its own rewards

    res.json({
      success: true,
      message: `Simulated ${results.length} matches across ${Math.max(...results.map(r => r.matchDay))} matchdays`,
      data: {
        results
      }
    });
  } catch (error) {
    console.error('Error simulating entire league:', error);
    res.status(500).json({
      error: 'Failed to simulate entire league',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get league status and progress for continuous leagues
export const getLeagueStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lobbyId } = req.params;
    const { matchDay } = req.query;

    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      select: { 
        currentMatchDay: true,
        nextMatchDay: true,
        isActive: true,
        admin: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    // Get specific matchday or current matchday
    const requestedMatchDay = matchDay ? Number(matchDay) : lobby.currentMatchDay;

    const [totalMatches, playedMatches, leagueTable, scheduledMatchDay] = await Promise.all([
      prisma.match.count({ 
        where: { 
          lobbyId, 
          matchDay: requestedMatchDay 
        } 
      }),
      prisma.match.count({ 
        where: { 
          lobbyId, 
          matchDay: requestedMatchDay, 
          played: true 
        } 
      }),
      prisma.leagueTable.findMany({
        where: { 
          lobbyId, 
          matchDay: requestedMatchDay 
        },
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: [
          { points: 'desc' },
          { goalsFor: 'desc' },
          { goalsAgainst: 'asc' }
        ]
      }),
      prisma.scheduledMatchDay.findFirst({
        where: {
          lobbyId,
          executed: false
        },
        orderBy: {
          scheduledAt: 'asc'
        }
      })
    ]);

    // Get all matchdays with data
    const allMatchDays = await prisma.leagueTable.findMany({
      where: { lobbyId },
      select: { matchDay: true },
      distinct: ['matchDay'],
      orderBy: { matchDay: 'asc' }
    });

    const availableMatchDays = allMatchDays.map(md => md.matchDay);

    const matchdayComplete = totalMatches > 0 && playedMatches === totalMatches;

    res.json({
      success: true,
      data: {
        lobbyId,
        currentMatchDay: lobby.currentMatchDay,
        requestedMatchDay,
        nextMatchDay: lobby.nextMatchDay,
        nextScheduledMatchDay: scheduledMatchDay,
        isActive: lobby.isActive,
        admin: lobby.admin,
        totalMatches,
        playedMatches,
        remainingMatches: totalMatches - playedMatches,
        matchdayComplete,
        availableMatchDays,
        leagueTable: leagueTable.map((entry, index) => ({
          ...entry,
          position: index + 1,
          goalDifference: entry.goalsFor - entry.goalsAgainst,
          matches: entry.wins + entry.draws + entry.losses
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching league status:', error);
    res.status(500).json({
      error: 'Failed to fetch league status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

