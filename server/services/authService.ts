import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { generateTokens, verifyRefreshToken } from '../middleware/auth';
import { authenticateWithGoogle } from '../auth/googleAuth';
import type { InsertUser } from '@shared/schema';

export class AuthService {
  // Register new user
  async register(userData: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create user
    const newUser = await storage.createUser({
      ...userData,
      password: hashedPassword,
      role: 'consumer',
      isVerified: false,
      referralCode: this.generateReferralCode(),
    } as InsertUser);

    // Generate tokens
    const tokens = generateTokens(newUser.id);

    // Update refresh token in database
    await storage.updateUser(newUser.id, { 
      refreshToken: tokens.refreshToken,
      lastActiveAt: new Date()
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        isVerified: newUser.isVerified,
      },
      tokens,
    };
  }

  // Login user
  async login(email: string, password: string) {
    // Find user
    const user = await storage.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = generateTokens(user.id);

    // Update refresh token and last active
    await storage.updateUser(user.id, { 
      refreshToken: tokens.refreshToken,
      lastActiveAt: new Date()
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified,
        pointsBalance: user.pointsBalance,
        walletBalance: user.walletBalance,
      },
      tokens,
    };
  }

  // Refresh access token
  async refreshToken(refreshToken: string) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await storage.getUser(decoded.userId);
      
      if (!user || user.refreshToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = generateTokens(user.id);

      // Update refresh token in database
      await storage.updateUser(user.id, { 
        refreshToken: tokens.refreshToken,
        lastActiveAt: new Date()
      });

      return tokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Logout user
  async logout(userId: string) {
    await storage.updateUser(userId, { refreshToken: null });
  }

  // Google OAuth authentication
  async authenticateWithGoogle(code: string) {
    return authenticateWithGoogle(code);
  }

  // Password reset request
  async requestPasswordReset(email: string) {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = this.generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await storage.createPasswordReset({
      email,
      token: resetToken,
      expiresAt,
    });

    // In a real app, send email here
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  // Reset password
  async resetPassword(token: string, newPassword: string) {
    const resetRequest = await storage.getPasswordReset(token);
    
    if (!resetRequest || resetRequest.expiresAt < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await storage.updateUserPassword(resetRequest.email, hashedPassword);
    await storage.deletePasswordReset(token);

    return { message: 'Password reset successfully' };
  }

  // Helper methods
  private generateReferralCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private generateResetToken(): string {
    return Math.random().toString(36).substring(2, 32);
  }
}

export const authService = new AuthService();