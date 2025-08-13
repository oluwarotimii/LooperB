import { storage } from "../storage";
import { notificationService } from "./notificationService";
import type { User, UserFavorite } from "@shared/schema";

export class UserService {
  async getUserProfile(userId: string): Promise<User | null> {
    const user = await storage.getUser(userId);
    if (!user) return null;

    // Don't return sensitive information
    const { passwordHash, ...safeUser } = user;
    return safeUser as User;
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const user = await storage.updateUser(userId, updates);
    
    // Update last active timestamp
    await storage.updateUser(userId, { lastActiveAt: new Date() });
    
    return user;
  }

  async getUserFavorites(userId: string, type?: "business" | "listing"): Promise<UserFavorite[]> {
    return await storage.getUserFavorites(userId, type);
  }

  async addFavorite(userId: string, entityId: string, type: "business" | "listing"): Promise<UserFavorite> {
    return await storage.addFavorite(userId, entityId, type);
  }

  async removeFavorite(userId: string, entityId: string, type: "business" | "listing"): Promise<boolean> {
    return await storage.removeFavorite(userId, entityId, type);
  }

  async generateReferralCode(userId: string): Promise<string> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await storage.updateUser(userId, { referralCode: code });
    return code;
  }

  async processReferral(referredUserId: string, referralCode: string): Promise<boolean> {
    try {
      // Find referrer by referral code
      const referrer = await this.getUserByReferralCode(referralCode);
      if (!referrer) return false;

      // Create referral record
      await storage.createReferral(referrer.id, referredUserId);

      // Award points to both users
      await storage.addPoints(referrer.id, 100, "referral_bonus");
      await storage.addPoints(referredUserId, 50, "referral_signup");

      // Send notifications
      await notificationService.createNotification({
        userId: referrer.id,
        title: "Referral Success!",
        message: "You've earned 100 points for referring a friend!",
        type: "system",
      });

      return true;
    } catch (error) {
      console.error("Error processing referral:", error);
      return false;
    }
  }

  private async getUserByReferralCode(code: string): Promise<User | null> {
    return await storage.getUserByReferralCode(code);
  }

  async updateLastActive(userId: string): Promise<void> {
    await storage.updateUser(userId, { lastActiveAt: new Date() });
  }

  async deactivateUser(userId: string, reason?: string): Promise<void> {
    await storage.updateUser(userId, { 
      isVerified: false,
      updatedAt: new Date()
    });

    // Send notification
    await notificationService.createNotification({
      userId,
      title: "Account Deactivated",
      message: reason || "Your account has been deactivated.",
      type: "system",
      priority: "high",
    });
  }
}

export const userService = new UserService();
