import { storage } from "../storage";
import { notificationService } from "./notificationService";

export class ReferralService {
  async createReferral(referrerId: string, referredEmail: string): Promise<any> {
    const referredUser = await storage.getUserByEmail(referredEmail);

    if (!referredUser) {
      throw new Error("Referred user not found");
    }

    if (referrerId === referredUser.id) {
      throw new Error("Cannot refer yourself");
    }

    const existingReferral = await storage.getReferral(referrerId, referredUser.id);
    if (existingReferral) {
      throw new Error("Referral already exists");
    }

    const referral = await storage.createReferral(referrerId, referredUser.id);

    // Award bonus to referrer
    await storage.addPoints(referrerId, 100, "referral_bonus", referral.id);
    await notificationService.createNotification({
      userId: referrerId,
      title: "Referral Bonus!",
      message: `You've earned 100 points for referring ${referredUser.fullName || referredUser.email}!`, 
      type: "system",
    });

    // Award bonus to referred user
    await storage.addPoints(referredUser.id, 50, "referred_bonus", referral.id);
    await notificationService.createNotification({
      userId: referredUser.id,
      title: "Welcome Bonus!",
      message: `You've received 50 points as a welcome bonus from a referral!`, 
      type: "system",
    });

    return referral;
  }

  async getReferralsByUser(userId: string): Promise<any[]> {
    return await storage.getReferralsByUser(userId);
  }

  async getPointsHistory(userId: string): Promise<any[]> {
    return await storage.getPointsHistory(userId);
  }
}

export const referralService = new ReferralService();