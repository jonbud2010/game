import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
      lobby?: {
        id: string;
        name: string;
        adminId: string;
        isActive: boolean;
        currentMatchDay: number;
      };
    }
  }
}