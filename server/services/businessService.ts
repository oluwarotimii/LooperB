import { storage } from "../storage";
import { notificationService } from "./notificationService";
import { emailService } from "./emailService";
import type { Business, InsertBusiness } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';

export class BusinessService {
  async createBusiness(userId: string, businessData: InsertBusiness): Promise<Business> {
    // Create business
    const business = await storage.createBusiness(businessData);
    
    // Add user as owner
    await storage.addBusinessUser(userId, business.id, "owner");
    
    // Update user role
    await storage.updateUser(userId, { role: "business_owner" });
    
    // Send notification
    await notificationService.createNotification({
      userId,
      title: "Business Created",
      message: `Your business "${business.businessName}" has been created and is pending verification.`,
      type: "system",
      relatedEntityId: business.id,
      relatedEntityType: "business",
    });
    
    return business;
  }

  async getBusinessDetails(businessId: string): Promise<Business | null> {
    const business = await storage.getBusiness(businessId);
    return business || null;
  }

  async getUserBusinesses(userId: string): Promise<Business[]> {
    return await storage.getUserBusinesses(userId);
  }

  async updateBusiness(businessId: string, updates: Partial<Business>): Promise<Business> {
    return await storage.updateBusiness(businessId, updates);
  }

  async searchBusinesses(filters: any): Promise<Business[]> {
    if (filters.latitude && filters.longitude) {
      const radius = parseFloat(filters.radius) || 10; // Default 10km radius
      return await storage.getBusinessesByLocation(
        parseFloat(filters.latitude),
        parseFloat(filters.longitude),
        radius
      );
    }

    if (filters.q) {
      return await storage.searchBusinesses(filters.q, filters);
    }

    return [];
  }

  async verifyBusiness(businessId: string, approved: boolean, reason?: string): Promise<void> {
    const status = approved ? "verified" : "rejected";
    await storage.updateBusiness(businessId, { 
      verificationStatus: status,
      updatedAt: new Date()
    });

    // Get business users to notify
    const businessUsers = await storage.getBusinessUsers(businessId);
    const business = await storage.getBusiness(businessId);
    
    for (const businessUser of businessUsers) {
      await notificationService.createNotification({
        userId: businessUser.userId,
        title: approved ? "Business Verified!" : "Business Verification Failed",
        message: approved 
          ? `Your business "${business?.businessName}" has been verified and can now list food items.`
          : `Your business verification was rejected. Reason: ${reason || "Please contact support."}`,
        type: "system",
        priority: approved ? "normal" : "high",
        relatedEntityId: businessId,
        relatedEntityType: "business",
      });
    }
  }

  async inviteStaff(businessId: string, email: string, role: "manager" | "staff"): Promise<any> {
    const business = await storage.getBusiness(businessId);
    if (!business) {
      throw new Error("Business not found");
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry

    await storage.createStaffInvitation(businessId, email, role, token, expiresAt);

    // Send invitation email
    await emailService.sendStaffInvitationEmail(email, business.businessName, role, token);
    
    return {
      businessId,
      email,
      role,
      status: "pending",
      invitedAt: new Date(),
      token, // For testing purposes, remove in production
    };
  }

  async acceptStaffInvitation(userId: string, businessId: string, role: "manager" | "staff"): Promise<void> {
    await storage.addBusinessUser(userId, businessId, role);
    
    const business = await storage.getBusiness(businessId);
    
    await notificationService.createNotification({
      userId,
      title: "Welcome to the Team!",
      message: `You've successfully joined "${business?.businessName}" as a ${role}.`,
      type: "system",
      relatedEntityId: businessId,
      relatedEntityType: "business",
    });
  }

  async updateBusinessHours(businessId: string, openingHours: any): Promise<Business> {
    return await storage.updateBusiness(businessId, { 
      openingHours,
      updatedAt: new Date()
    });
  }

  async updateBusinessLocation(businessId: string, latitude: string, longitude: string, address: string): Promise<Business> {
    return await storage.updateBusiness(businessId, {
      latitude,
      longitude,
      address,
      updatedAt: new Date()
    });
  }

  async deactivateBusiness(businessId: string, reason?: string): Promise<void> {
    await storage.updateBusiness(businessId, { 
      isActive: false,
      updatedAt: new Date()
    });

    // Notify all business users
    const businessUsers = await storage.getBusinessUsers(businessId);
    const business = await storage.getBusiness(businessId);
    
    for (const businessUser of businessUsers) {
      await notificationService.createNotification({
        userId: businessUser.userId,
        title: "Business Deactivated",
        message: `Your business "${business?.businessName}" has been deactivated. ${reason || "Please contact support for more information."}`,
        type: "system",
        priority: "high",
        relatedEntityId: businessId,
        relatedEntityType: "business",
      });
    }
  }
}

export const businessService = new BusinessService();
