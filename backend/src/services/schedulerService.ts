import * as cron from 'node-cron';
import moment from 'moment-timezone';
import { prisma } from '../db/connection';

/**
 * Scheduler Service for Automated Matchday Management
 * Handles automatic scheduling and execution of matchdays at 18:00 Berlin time every 5 days
 */

const BERLIN_TIMEZONE = 'Europe/Berlin';
const MATCHDAY_TIME = '18:00';
const MATCHDAY_INTERVAL_DAYS = 5;

/**
 * Initialize the scheduler system
 */
export const initializeScheduler = (): void => {
  console.log('🕒 Initializing matchday scheduler...');

  // Schedule daily check at 18:00 Berlin time
  cron.schedule('0 18 * * *', async () => {
    const berlinTime = moment().tz(BERLIN_TIMEZONE);
    console.log(`⏰ Daily scheduler check at ${berlinTime.format('YYYY-MM-DD HH:mm:ss')} Berlin time`);
    
    await executeScheduledMatchDays();
  }, {
    timezone: BERLIN_TIMEZONE
  });

  // Also run a check every hour for any missed executions
  cron.schedule('0 * * * *', async () => {
    await checkMissedMatchDays();
  });

  console.log('✅ Matchday scheduler initialized successfully');
};

/**
 * Execute scheduled matchdays that are due
 */
const executeScheduledMatchDays = async (): Promise<void> => {
  try {
    const now = moment().tz(BERLIN_TIMEZONE);
    console.log(`🔍 Checking for scheduled matchdays at ${now.format('YYYY-MM-DD HH:mm:ss')} Berlin time`);

    // Find all scheduled matchdays that should be executed now
    const dueMatchDays = await prisma.scheduledMatchDay.findMany({
      where: {
        executed: false,
        scheduledAt: {
          lte: now.toDate()
        }
      },
      include: {
        lobby: {
          include: {
            members: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    console.log(`📋 Found ${dueMatchDays.length} matchdays to execute`);

    for (const scheduledMatchDay of dueMatchDays) {
      try {
        await executeMatchDay(scheduledMatchDay);
      } catch (error) {
        console.error(`❌ Error executing matchday ${scheduledMatchDay.matchDay} for lobby ${scheduledMatchDay.lobbyId}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error in executeScheduledMatchDays:', error);
  }
};

/**
 * Check for any missed matchdays and execute them
 */
const checkMissedMatchDays = async (): Promise<void> => {
  try {
    const now = moment().tz(BERLIN_TIMEZONE);
    const oneDayAgo = now.clone().subtract(1, 'day');

    // Find matchdays that were scheduled more than 1 hour ago but not executed
    const missedMatchDays = await prisma.scheduledMatchDay.findMany({
      where: {
        executed: false,
        scheduledAt: {
          gte: oneDayAgo.toDate(),
          lt: now.clone().subtract(1, 'hour').toDate()
        }
      },
      include: {
        lobby: {
          include: {
            members: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    if (missedMatchDays.length > 0) {
      console.log(`⚠️ Found ${missedMatchDays.length} missed matchdays, executing now...`);
      
      for (const missedMatchDay of missedMatchDays) {
        try {
          await executeMatchDay(missedMatchDay);
        } catch (error) {
          console.error(`❌ Error executing missed matchday ${missedMatchDay.matchDay} for lobby ${missedMatchDay.lobbyId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error in checkMissedMatchDays:', error);
  }
};

/**
 * Execute a specific matchday
 */
const executeMatchDay = async (scheduledMatchDay: any): Promise<void> => {
  const { lobby, matchDay, lobbyId } = scheduledMatchDay;
  
  console.log(`🎮 Executing matchday ${matchDay} for lobby "${lobby.name}" (${lobbyId})`);

  try {
    await prisma.$transaction(async (tx) => {
      // Check if lobby has enough active members (at least 4)
      if (lobby.members.length < 4) {
        console.log(`⚠️ Skipping matchday ${matchDay} for lobby ${lobbyId}: insufficient members (${lobby.members.length}/4)`);
        return;
      }

      // Update lobby current matchday
      await tx.lobby.update({
        where: { id: lobbyId },
        data: {
          currentMatchDay: matchDay,
          nextMatchDay: null // Clear until next scheduling
        }
      });

      // Initialize league table for this matchday
      const leagueTableData = lobby.members.map(member => ({
        lobbyId,
        userId: member.userId,
        matchDay,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        position: 1
      }));

      await tx.leagueTable.createMany({
        data: leagueTableData
      });

      // Generate matches for this matchday (6 matches for 4 players round-robin)
      const matches = generateRoundRobinMatches(lobby.members, lobbyId, matchDay);
      
      // Note: We're creating match placeholders. Actual teams need to be created by users
      // The match creation will be handled separately when users create their teams
      console.log(`📅 Matchday ${matchDay} initialized for lobby ${lobbyId} with ${matches.length} potential matches`);

      // Mark scheduled matchday as executed
      await tx.scheduledMatchDay.update({
        where: { id: scheduledMatchDay.id },
        data: {
          executed: true,
          executedAt: new Date()
        }
      });

      // Schedule next matchday (5 days from now at 18:00 Berlin time)
      const nextScheduledAt = moment().tz(BERLIN_TIMEZONE)
        .add(MATCHDAY_INTERVAL_DAYS, 'days')
        .hour(18)
        .minute(0)
        .second(0)
        .millisecond(0);

      await tx.scheduledMatchDay.create({
        data: {
          lobbyId,
          matchDay: matchDay + 1,
          scheduledAt: nextScheduledAt.toDate()
        }
      });

      await tx.lobby.update({
        where: { id: lobbyId },
        data: {
          nextMatchDay: nextScheduledAt.toDate()
        }
      });

      console.log(`✅ Matchday ${matchDay} executed successfully for lobby ${lobbyId}`);
      console.log(`📅 Next matchday ${matchDay + 1} scheduled for ${nextScheduledAt.format('YYYY-MM-DD HH:mm:ss')} Berlin time`);
    });
  } catch (error) {
    console.error(`❌ Error in executeMatchDay for lobby ${lobbyId}, matchday ${matchDay}:`, error);
    throw error;
  }
};

/**
 * Generate round-robin match combinations for 4 players
 */
const generateRoundRobinMatches = (members: any[], lobbyId: string, matchDay: number) => {
  const matches = [];
  
  // Round-robin for 4 players: 6 matches total
  // Player combinations: (1,2), (1,3), (1,4), (2,3), (2,4), (3,4)
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      matches.push({
        lobbyId,
        homeUserId: members[i].userId,
        awayUserId: members[j].userId,
        matchDay,
        homeScore: 0,
        awayScore: 0,
        played: false
      });
    }
  }
  
  return matches;
};

/**
 * Manually schedule a matchday for a specific lobby
 */
export const scheduleMatchDay = async (lobbyId: string, scheduledAt: Date): Promise<void> => {
  try {
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      select: {
        currentMatchDay: true,
        isActive: true
      }
    });

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (!lobby.isActive) {
      throw new Error('Lobby is not active');
    }

    const nextMatchDay = lobby.currentMatchDay + 1;

    await prisma.scheduledMatchDay.create({
      data: {
        lobbyId,
        matchDay: nextMatchDay,
        scheduledAt
      }
    });

    await prisma.lobby.update({
      where: { id: lobbyId },
      data: {
        nextMatchDay: scheduledAt
      }
    });

    console.log(`📅 Matchday ${nextMatchDay} scheduled manually for lobby ${lobbyId} at ${moment(scheduledAt).tz(BERLIN_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')} Berlin time`);
  } catch (error) {
    console.error('❌ Error in scheduleMatchDay:', error);
    throw error;
  }
};

/**
 * Auto-schedule matchdays for all active lobbies
 * This can be called to set up initial scheduling for existing lobbies
 */
export const autoScheduleAllLobbies = async (): Promise<void> => {
  try {
    console.log('🔄 Auto-scheduling matchdays for all active lobbies...');

    const activeLobbies = await prisma.lobby.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        currentMatchDay: true
      }
    });

    for (const lobby of activeLobbies) {
      // Check if there's already a scheduled matchday
      const existingSchedule = await prisma.scheduledMatchDay.findFirst({
        where: {
          lobbyId: lobby.id,
          executed: false
        }
      });

      if (!existingSchedule) {
        // Schedule next matchday 5 days from now at 18:00 Berlin time
        const nextScheduledAt = moment().tz(BERLIN_TIMEZONE)
          .add(MATCHDAY_INTERVAL_DAYS, 'days')
          .hour(18)
          .minute(0)
          .second(0)
          .millisecond(0);

        await scheduleMatchDay(lobby.id, nextScheduledAt.toDate());
        console.log(`📅 Auto-scheduled next matchday for lobby "${lobby.name}"`);
      }
    }

    console.log('✅ Auto-scheduling completed');
  } catch (error) {
    console.error('❌ Error in autoScheduleAllLobbies:', error);
    throw error;
  }
};

/**
 * Get current Berlin time
 */
export const getBerlinTime = (): moment.Moment => {
  return moment().tz(BERLIN_TIMEZONE);
};

/**
 * Calculate next standard matchday time (next occurrence of 18:00 Berlin time, 5 days from now)
 */
export const getNextStandardMatchDayTime = (): moment.Moment => {
  return moment().tz(BERLIN_TIMEZONE)
    .add(MATCHDAY_INTERVAL_DAYS, 'days')
    .hour(18)
    .minute(0)
    .second(0)
    .millisecond(0);
};