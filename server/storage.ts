import {
  users,
  businesses,
  businessUsers,
  foodListings,
  listingMedia,
  dietaryTags,
  listingDietaryTags,
  orders,
  orderItems,
  reviews,
  referrals,
  pointsHistory,
  walletTransactions,
  userFavorites,
  messages,
  reports,
  notifications,
  businessAnalytics,
  type User,
  type InsertUser,
  type Business,
  type InsertBusiness,
  type FoodListing,
  type InsertFoodListing,
  type Order,
  type InsertOrder,
  type OrderItem,
  type Review,
  type InsertReview,
  type Message,
  type InsertMessage,
  type Notification,
  type InsertNotification,
  type DietaryTag,
  type UserFavorite,
  type WalletTransaction,
  type PointsHistory,
  type BusinessUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, sql, like, ilike, gte, lte, inArray } from "drizzle-orm";
import { passwordResets, staffInvitations } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  userHasAccessToBusiness(userId: string, businessId: string): Promise<boolean>;

  // Business operations
  createBusiness(business: InsertBusiness): Promise<Business>;
  getBusiness(id: string): Promise<Business | undefined>;
  getBusinessesByLocation(lat: number, lng: number, radius: number): Promise<Business[]>;
  updateBusiness(id: string, updates: Partial<Business>): Promise<Business>;
  searchBusinesses(query: string, filters?: any): Promise<Business[]>;

  // Business user operations
  addBusinessUser(userId: string, businessId: string, role: "owner" | "manager" | "staff"): Promise<BusinessUser>;
  getBusinessUsers(businessId: string): Promise<BusinessUser[]>;
  getUserBusinesses(userId: string): Promise<Business[]>;

  // Food listing operations
  createFoodListing(listing: InsertFoodListing): Promise<FoodListing>;
  getFoodListing(id: string): Promise<FoodListing | undefined>;
  getFoodListingsByBusiness(businessId: string): Promise<FoodListing[]>;
  searchFoodListings(filters: any): Promise<FoodListing[]>;
  updateFoodListing(id: string, updates: Partial<FoodListing>): Promise<FoodListing>;
  deleteFoodListing(id: string): Promise<boolean>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getOrdersByBusiness(businessId: string): Promise<Order[]>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order>;
  getOrderByPickupCode(code: string): Promise<Order | undefined>;

  // Order item operations
  createOrderItems(items: Omit<OrderItem, "id">[]): Promise<OrderItem[]>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getReview(id: string): Promise<Review | undefined>;
  updateReview(id: string, updates: Partial<Review>): Promise<Review>;
  getReviewsByBusiness(businessId: string): Promise<Review[]>;
  getReviewsByUser(userId: string): Promise<Review[]>;
  updateBusinessRating(businessId: string): Promise<void>;

  // Wallet operations
  getWalletBalance(userId: string): Promise<number>;
  createWalletTransaction(transaction: Omit<WalletTransaction, "id">): Promise<WalletTransaction>;
  getWalletTransactions(userId: string): Promise<WalletTransaction[]>;
  updateWalletBalance(userId: string, amount: number): Promise<User>;

  // Points operations
  addPoints(userId: string, points: number, reason: string, orderId?: string): Promise<PointsHistory>;
  getPointsHistory(userId: string): Promise<PointsHistory[]>;

  // Referral operations
  createReferral(referrerId: string, referredId: string): Promise<typeof referrals.$inferSelect>;
  getReferral(referrerId: string, referredId: string): Promise<typeof referrals.$inferSelect | undefined>;
  getReferralsByUser(userId: string): Promise<typeof referrals.$inferSelect[]>;

  // Favorites operations
  addFavorite(userId: string, entityId: string, type: "business" | "listing"): Promise<UserFavorite>;
  removeFavorite(userId: string, entityId: string, type: "business" | "listing"): Promise<boolean>;
  getUserFavorites(userId: string, type?: "business" | "listing"): Promise<UserFavorite[]>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessage(id: string): Promise<Message | undefined>;
  getMessages(userId: string, businessId?: string): Promise<Message[]>;
  getConversation(userId: string, otherUserId: string): Promise<Message[]>;
  getBusinessConversation(userId: string, businessId: string): Promise<Message[]>;
  markMessageAsRead(messageId: string): Promise<Message>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<Notification>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Dietary tags
  getDietaryTags(): Promise<DietaryTag[]>;
  addListingDietaryTags(listingId: string, tagIds: string[]): Promise<void>;

  // Analytics
  getBusinessAnalytics(businessId: string, startDate?: Date, endDate?: Date): Promise<any[]>;
  getUserImpactStats(userId: string): Promise<any>;
  createReferral(referredUserId: string, referrerUserId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async userHasAccessToBusiness(userId: string, businessId: string): Promise<boolean> {
    const [businessUser] = await db
      .select()
      .from(businessUsers)
      .where(and(eq(businessUsers.userId, userId), eq(businessUsers.businessId, businessId)));
    return !!businessUser;
  }

  // Business operations
  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [newBusiness] = await db.insert(businesses).values(business).returning();
    return newBusiness;
  }

  async getBusiness(id: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business;
  }

  async getBusinessesByLocation(lat: number, lng: number, radius: number): Promise<Business[]> {
    // Simplified proximity search - in production, use PostGIS
    const businessList = await db
      .select()
      .from(businesses)
      .where(eq(businesses.isActive, true));
    
    return businessList.filter(business => {
      if (!business.latitude || !business.longitude) return false;
      const distance = this.calculateDistance(
        lat, lng, 
        parseFloat(business.latitude), 
        parseFloat(business.longitude)
      );
      return distance <= radius;
    });
  }

  async updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
    const [business] = await db
      .update(businesses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return business;
  }

  async searchBusinesses(query: string, filters?: any): Promise<Business[]> {
    let queryBuilder = db
      .select()
      .from(businesses)
      .where(eq(businesses.isActive, true));

    if (query) {
      queryBuilder = queryBuilder.where(ilike(businesses.businessName, `%${query}%`));
    }

    if (filters?.businessType) {
      queryBuilder = queryBuilder.where(eq(businesses.businessType, filters.businessType));
    }

    return await queryBuilder.orderBy(desc(businesses.averageRating));
  }

  async searchBusinessesFullText(query: string, filters?: any): Promise<Business[]> {
    // This is a simplified full-text search. For a robust solution, consider PostgreSQL's tsvector and tsquery.
    // For now, it will perform a case-insensitive LIKE search on businessName and description.
    let queryBuilder = db
      .select()
      .from(businesses)
      .where(eq(businesses.isActive, true));

    if (query) {
      queryBuilder = queryBuilder.where(or(
        ilike(businesses.businessName, `%${query}%`),
        ilike(businesses.description, `%${query}%`)
      ));
    }

    if (filters?.businessType) {
      queryBuilder = queryBuilder.where(eq(businesses.businessType, filters.businessType));
    }

    return await queryBuilder.orderBy(desc(businesses.averageRating));
  }

  // Business user operations
  async addBusinessUser(userId: string, businessId: string, role: "owner" | "manager" | "staff"): Promise<BusinessUser> {
    const [businessUser] = await db
      .insert(businessUsers)
      .values({ userId, businessId, role })
      .returning();
    return businessUser;
  }

  async getBusinessUsers(businessId: string): Promise<BusinessUser[]> {
    return await db
      .select()
      .from(businessUsers)
      .where(eq(businessUsers.businessId, businessId));
  }

  async getUserBusinesses(userId: string): Promise<Business[]> {
    const result = await db
      .select({
        business: businesses,
        role: businessUsers.role,
      })
      .from(businessUsers)
      .innerJoin(businesses, eq(businessUsers.businessId, businesses.id))
      .where(eq(businessUsers.userId, userId));
    
    return result.map(r => r.business);
  }

  // Food listing operations
  async createFoodListing(listing: InsertFoodListing): Promise<FoodListing> {
    const [newListing] = await db.insert(foodListings).values(listing).returning();
    return newListing;
  }

  async getFoodListing(id: string): Promise<FoodListing | undefined> {
    const [listing] = await db.select().from(foodListings).where(eq(foodListings.id, id));
    return listing;
  }

  async getFoodListingsByBusiness(businessId: string): Promise<FoodListing[]> {
    return await db
      .select()
      .from(foodListings)
      .where(eq(foodListings.businessId, businessId))
      .orderBy(desc(foodListings.createdAt));
  }

  async searchFoodListings(filters: any): Promise<FoodListing[]> {
    let queryBuilder = db
      .select()
      .from(foodListings)
      .where(eq(foodListings.status, "active"));

    if (filters.businessType) {
      queryBuilder = db
        .select()
        .from(foodListings)
        .innerJoin(businesses, eq(foodListings.businessId, businesses.id))
        .where(and(
          eq(foodListings.status, "active"),
          eq(businesses.businessType, filters.businessType)
        ));
    }

    if (filters.maxPrice) {
      queryBuilder = db
        .select()
        .from(foodListings)
        .where(and(
          eq(foodListings.status, "active"),
          lte(foodListings.discountedPrice, filters.maxPrice)
        ));
    }

    if (filters.expiringBefore) {
      queryBuilder = db
        .select()
        .from(foodListings)
        .where(and(
          eq(foodListings.status, "active"),
          lte(foodListings.pickupWindowEnd, filters.expiringBefore)
        ));
    }

    return await queryBuilder.orderBy(asc(foodListings.pickupWindowEnd));
  }

  async searchFoodListingsFullText(query: string, filters?: any): Promise<FoodListing[]> {
    let queryBuilder = db
      .select()
      .from(foodListings)
      .where(eq(foodListings.status, "active"));

    if (query) {
      queryBuilder = queryBuilder.where(or(
        ilike(foodListings.title, `%${query}%`),
        ilike(foodListings.description, `%${query}%`)
      ));
    }

    if (filters.businessType) {
      queryBuilder = queryBuilder
        .innerJoin(businesses, eq(foodListings.businessId, businesses.id))
        .where(and(
          eq(foodListings.status, "active"),
          eq(businesses.businessType, filters.businessType)
        ));
    }

    if (filters.maxPrice) {
      queryBuilder = queryBuilder
        .where(and(
          eq(foodListings.status, "active"),
          lte(foodListings.discountedPrice, filters.maxPrice)
        ));
    }

    if (filters.expiringBefore) {
      queryBuilder = queryBuilder
        .where(and(
          eq(foodListings.status, "active"),
          lte(foodListings.pickupWindowEnd, filters.expiringBefore)
        ));
    }

    return await queryBuilder.orderBy(asc(foodListings.pickupWindowEnd));
  }

  async updateFoodListing(id: string, updates: Partial<FoodListing>): Promise<FoodListing> {
    const [listing] = await db
      .update(foodListings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(foodListings.id, id))
      .returning();
    return listing;
  }

  async deleteFoodListing(id: string): Promise<boolean> {
    const result = await db.delete(foodListings).where(eq(foodListings.id, id));
    return result.rowCount! > 0;
  }

  // Order operations
  async createOrder(order: InsertOrder): Promise<Order> {
    const pickupCode = this.generatePickupCode();
    const [newOrder] = await db
      .insert(orders)
      .values({ ...order, pickupCode })
      .returning();
    return newOrder;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByBusiness(businessId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.businessId, businessId))
      .orderBy(desc(orders.createdAt));
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getOrderByPickupCode(code: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.pickupCode, code));
    return order;
  }

  // Order item operations
  async createOrderItems(items: Omit<OrderItem, "id">[]): Promise<OrderItem[]> {
    return await db.insert(orderItems).values(items).returning();
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  // Review operations
  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    
    // Update business rating
    await this.updateBusinessRating(review.businessId);
    
    return newReview;
  }

  async getReviewsByBusiness(businessId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.businessId, businessId))
      .orderBy(desc(reviews.createdAt));
  }

  async getReviewsByUser(userId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdAt));
  }

  async updateBusinessRating(businessId: string): Promise<void> {
    const result = await db
      .select({
        avgRating: sql<number>`avg((${reviews.ratingFood} + ${reviews.ratingService}) / 2)`,
        totalReviews: sql<number>`count(*)`,
      })
      .from(reviews)
      .where(eq(reviews.businessId, businessId));

    if (result[0]) {
      await db
        .update(businesses)
        .set({
          averageRating: result[0].avgRating?.toString() || "0",
          totalReviews: result[0].totalReviews || 0,
        })
        .where(eq(businesses.id, businessId));
    }
  }

  async getReview(id: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async updateReview(id: string, updates: Partial<Review>): Promise<Review> {
    const [review] = await db
      .update(reviews)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return review;
  }

  // Wallet operations
  async getWalletBalance(userId: string): Promise<number> {
    const user = await this.getUser(userId);
    return parseFloat(user?.walletBalance || "0");
  }

  async createWalletTransaction(transaction: Omit<WalletTransaction, "id">): Promise<WalletTransaction> {
    const [newTransaction] = await db.insert(walletTransactions).values(transaction).returning();
    return newTransaction;
  }

  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
    return await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt));
  }

  async updateWalletBalance(userId: string, amount: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        walletBalance: sql`${users.walletBalance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Points operations
  async addPoints(userId: string, points: number, reason: string, orderId?: string): Promise<PointsHistory> {
    const [pointsEntry] = await db.insert(pointsHistory).values({
      userId,
      pointsChange: points,
      reason,
      orderId,
    }).returning();

    // Update user points balance
    await db
      .update(users)
      .set({
        pointsBalance: sql`${users.pointsBalance} + ${points}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return pointsEntry;
  }

  async getPointsHistory(userId: string): Promise<PointsHistory[]> {
    return await db
      .select()
      .from(pointsHistory)
      .where(eq(pointsHistory.userId, userId))
      .orderBy(desc(pointsHistory.createdAt));
  }

  // Password reset operations
  async createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResets).values({ email, token, expiresAt }).onConflictDoUpdate({
      target: passwordResets.email,
      set: { token, expiresAt },
    });
  }

  async getPasswordResetToken(token: string): Promise<typeof passwordResets.$inferSelect | undefined> {
    const [resetToken] = await db.select().from(passwordResets).where(eq(passwordResets.token, token));
    return resetToken;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await db.delete(passwordResets).where(eq(passwordResets.token, token));
  }

  // Favorites operations
  async addFavorite(userId: string, entityId: string, type: "business" | "listing"): Promise<UserFavorite> {
    const [favorite] = await db.insert(userFavorites).values({
      userId,
      businessId: type === "business" ? entityId : null,
      listingId: type === "listing" ? entityId : null,
      type,
    }).returning();
    return favorite;
  }

  async removeFavorite(userId: string, entityId: string, type: "business" | "listing"): Promise<boolean> {
    const result = await db
      .delete(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.type, type),
          type === "business" 
            ? eq(userFavorites.businessId, entityId)
            : eq(userFavorites.listingId, entityId)
        )
      );
    return result.rowCount! > 0;
  }

  async getUserFavorites(userId: string, type?: "business" | "listing"): Promise<UserFavorite[]> {
    let queryBuilder = db
      .select()
      .from(userFavorites)
      .where(eq(userFavorites.userId, userId));

    if (type) {
      queryBuilder = db
        .select()
        .from(userFavorites)
        .where(and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.type, type)
        ));
    }

    return await queryBuilder.orderBy(desc(userFavorites.createdAt));
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getMessages(userId: string, businessId?: string): Promise<Message[]> {
    let queryBuilder = db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.senderId, userId),
          businessId ? eq(messages.businessId, businessId) : sql`true`
        )
      );

    return await queryBuilder.orderBy(desc(messages.createdAt));
  }

  async markMessageAsRead(messageId: string): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning();
    return message;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getConversation(userId: string, otherUserId: string): Promise<Message[]> {
    return await db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
        and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
      )
    ).orderBy(asc(messages.createdAt));
  }

  async getBusinessConversation(userId: string, businessId: string): Promise<Message[]> {
    return await db.select().from(messages).where(
      and(
        eq(messages.businessId, businessId),
        or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
      )
    ).orderBy(asc(messages.createdAt));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning();
    return notification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  // Report operations
  async createReport(report: { reporterId?: string; entityType: "business" | "listing" | "user" | "review"; entityId: string; reason: string; description?: string; evidence?: any; }): Promise<typeof reports.$inferSelect> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  // Dietary tags
  async getDietaryTags(): Promise<DietaryTag[]> {
    return await db.select().from(dietaryTags).orderBy(asc(dietaryTags.tagName));
  }

  async addListingDietaryTags(listingId: string, tagIds: string[]): Promise<void> {
    const values = tagIds.map(tagId => ({ listingId, tagId }));
    await db.insert(listingDietaryTags).values(values).execute();
  }

  // Staff invitation operations
  async createStaffInvitation(businessId: string, email: string, role: "manager" | "staff", token: string, expiresAt: Date): Promise<typeof staffInvitations.$inferSelect> {
    const [invitation] = await db.insert(staffInvitations).values({ businessId, email, role, token, expiresAt }).returning();
    return invitation;
  }

  async getStaffInvitation(token: string): Promise<typeof staffInvitations.$inferSelect | undefined> {
    const [invitation] = await db.select().from(staffInvitations).where(eq(staffInvitations.token, token));
    return invitation;
  }

  async deleteStaffInvitation(token: string): Promise<void> {
    await db.delete(staffInvitations).where(eq(staffInvitations.token, token));
  }

  // Missing methods implementation
  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user;
  }

  async createReferral(referrerId: string, referredId: string): Promise<typeof referrals.$inferSelect> {
    const [referral] = await db.insert(referrals).values({
      referrerId,
      referredId,
    }).returning();
    return referral;
  }

  async getReferral(referrerId: string, referredId: string): Promise<typeof referrals.$inferSelect | undefined> {
    const [referral] = await db.select().from(referrals)
      .where(and(
        eq(referrals.referrerId, referrerId),
        eq(referrals.referredId, referredId)
      ));
    return referral;
  }

  async getReferralsByUser(userId: string): Promise<typeof referrals.$inferSelect[]> {
    return await db.select().from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async getBusinessAnalytics(businessId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    let query = db.select().from(businessAnalytics).where(eq(businessAnalytics.businessId, businessId));
    
    if (startDate) {
      query = query.where(gte(businessAnalytics.date, startDate));
    }
    if (endDate) {
      query = query.where(lte(businessAnalytics.date, endDate));
    }
    
    return await query.orderBy(desc(businessAnalytics.date));
  }

  async getUserImpactStats(userId: string): Promise<any> {
    const user = await this.getUser(userId);
    return {
      totalMealsRescued: user?.totalMealsRescued || 0,
      co2Saved: 0, // Calculate from orders
      pointsEarned: user?.pointsBalance || 0
    };
  }

  // Helper methods
  private generatePickupCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Password reset operations
  async createPasswordReset(data: { email: string; token: string; expiresAt: Date }) {
    const [reset] = await db.insert(passwordResets).values(data).returning();
    return reset;
  }

  async getPasswordReset(token: string) {
    const [reset] = await db.select().from(passwordResets).where(eq(passwordResets.token, token));
    return reset;
  }

  async deletePasswordReset(token: string) {
    await db.delete(passwordResets).where(eq(passwordResets.token, token));
  }

  async updateUserPassword(email: string, hashedPassword: string) {
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();
