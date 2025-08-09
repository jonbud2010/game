import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client';

// Allow injection of test database for integration tests
let testDbOverride: any = null;
export function setTestDatabase(testDb: any) {
  testDbOverride = testDb;
}
export function clearTestDatabase() {
  testDbOverride = null;
}

// Get the appropriate database client (test or production)
function getDbClient() {
  return testDbOverride || prisma;
}

// Use global Request type extension from types/express.d.ts

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

// Authenticate JWT token
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    
    // Get user from database
    const db = getDbClient();
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    // Add user info to request
    req.userId = user.id;
    req.user = { ...user, userId: user.id } as any;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Require admin role
export function requireAdmin(req: Request, res: Response, next: NextFunction): Response | void {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

// Optional authentication (doesn't fail if no token)
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without authentication
    }

    if (!process.env.JWT_SECRET) {
      return next(); // Continue without authentication if JWT_SECRET is missing
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    
    const db = getDbClient();
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      }
    });

    if (user) {
      req.userId = user.id;
      req.user = { ...user, userId: user.id } as any;
    }

    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
}