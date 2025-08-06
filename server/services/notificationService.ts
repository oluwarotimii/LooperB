import { storage } from "../storage";
import type { Notification, InsertNotification } from "@shared/schema";

export class NotificationService {
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const notification = await storage.createNotification(notificationData);
    
    // Send real-time notification via WebSocket if available
    this.sendRealTimeNotification(notificationData.userId, notification);
    
    // Send push notification if enabled
    await this.sendPushNotification(notification);
    
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await storage.getUserNotifications(userId);
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    return await storage.markNotificationAsRead(notificationId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await storage.markAllNotificationsAsRead(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await storage.getUserNotifications(userId);
    return notifications.filter(n => !n.isRead).length;
  }

  async sendBulkNotification(
    userIds: string[],
    title: string,
    message: string,
    type: "order_update" | "new_listing" | "deal_expiring" | "payment" | "review" | "system",
    priority: "low" | "normal" | "high" | "urgent" = "normal"
  ): Promise<void> {
    const notifications = userIds.map(userId => ({
      userId,
      title,
      message,
      type,
      priority,
    }));

    for (const notificationData of notifications) {
      await this.createNotification(notificationData);
    }
  }

  async scheduleNotification(
    notificationData: InsertNotification,
    scheduleTime: Date
  ): Promise<void> {
    // In a production environment, this would use a job queue like Bull or Agenda
    const delay = scheduleTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(async () => {
        await this.createNotification(notificationData);
      }, delay);
    } else {
      await this.createNotification(notificationData);
    }
  }

  async sendExpiryReminders(): Promise<void> {
    // Get listings expiring in the next 2 hours
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const expiringListings = await storage.searchFoodListings({
      status: "active",
      expiringBefore: twoHoursFromNow,
    });

    for (const listing of expiringListings) {
      const business = await storage.getBusiness(listing.businessId);
      const businessUsers = await storage.getBusinessUsers(listing.businessId);

      // Notify business users
      for (const businessUser of businessUsers) {
        await this.createNotification({
          userId: businessUser.userId,
          title: "Listing Expiring Soon",
          message: `"${listing.title}" expires in less than 2 hours. Consider reducing the price.`,
          type: "deal_expiring",
          priority: "high",
          relatedEntityId: listing.id,
          relatedEntityType: "listing",
        });
      }
    }
  }

  async sendDailyDigest(userId: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) return;

    // Get user's favorite businesses
    const favorites = await storage.getUserFavorites(userId, "business");
    
    if (favorites.length === 0) return;

    const businessIds = favorites.map(f => f.businessId).filter(Boolean) as string[];
    
    // Get active listings from favorite businesses
    const activeListings = [];
    for (const businessId of businessIds) {
      const listings = await storage.getFoodListingsByBusiness(businessId);
      activeListings.push(...listings.filter(l => l.status === "active"));
    }

    if (activeListings.length > 0) {
      await this.createNotification({
        userId,
        title: "Daily Deals from Your Favorites",
        message: `${activeListings.length} new deals available from your favorite businesses!`,
        type: "new_listing",
        priority: "normal",
      });
    }
  }

  async sendLocationBasedNotifications(userId: string, latitude: number, longitude: number): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) return;

    // Get nearby businesses (5km radius)
    const nearbyBusinesses = await storage.getBusinessesByLocation(latitude, longitude, 5);
    
    // Get active listings from nearby businesses
    const nearbyListings = [];
    for (const business of nearbyBusinesses) {
      const listings = await storage.getFoodListingsByBusiness(business.id);
      nearbyListings.push(...listings.filter(l => l.status === "active"));
    }

    // Send notification if there are urgent deals nearby
    const urgentDeals = nearbyListings.filter(listing => {
      const timeUntilExpiry = new Date(listing.pickupWindowEnd).getTime() - Date.now();
      return timeUntilExpiry <= 2 * 60 * 60 * 1000; // 2 hours or less
    });

    if (urgentDeals.length > 0) {
      await this.createNotification({
        userId,
        title: "Urgent Deals Nearby!",
        message: `${urgentDeals.length} deals expiring soon within 5km of your location.`,
        type: "deal_expiring",
        priority: "high",
      });
    }
  }

  async cleanupExpiredNotifications(): Promise<void> {
    // This would require a custom query to delete expired notifications
    // For now, we'll just log it
    console.log("Cleaning up expired notifications...");
  }

  private sendRealTimeNotification(userId: string, notification: Notification): void {
    // This would integrate with the WebSocket server
    // Access through app.locals.broadcastToUser if available
    if (global.app?.locals?.broadcastToUser) {
      global.app.locals.broadcastToUser(userId, {
        type: 'notification',
        data: notification,
      });
    }
  }

  private async sendPushNotification(notification: Notification): Promise<void> {
    // This would integrate with FCM or other push notification services
    // For now, we'll just log it
    console.log(`Push notification for user ${notification.userId}: ${notification.title}`);
    
    // In production, this would:
    // 1. Get user's device tokens
    // 2. Send push notification via FCM
    // 3. Handle delivery failures
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      smsNotifications?: boolean;
      dealExpiry?: boolean;
      orderUpdates?: boolean;
      newListings?: boolean;
    }
  ): Promise<void> {
    // This would require a user preferences table
    // For now, we'll store in user metadata or separate table
    console.log(`Updating notification preferences for user ${userId}:`, preferences);
  }

  async getNotificationStats(userId: string): Promise<any> {
    const notifications = await storage.getUserNotifications(userId);
    
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };

    notifications.forEach(notification => {
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      stats.byPriority[notification.priority || 'normal'] = (stats.byPriority[notification.priority || 'normal'] || 0) + 1;
    });

    return stats;
  }
}

export const notificationService = new NotificationService();
