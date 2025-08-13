import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface AuthRequest extends Request {
  user?: any;
  userId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Middleware to check if user has access to business
export const requireBusinessAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { businessId } = req.params;
  const userId = req.userId;

  if (!userId || !businessId) {
    return res.status(400).json({ error: 'Missing user or business ID' });
  }

  try {
    const hasAccess = await storage.userHasAccessToBusiness(userId, businessId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this business' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error checking business access' });
  }
};

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};