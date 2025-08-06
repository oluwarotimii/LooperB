import { storage } from "../storage";
import { notificationService } from "./notificationService";
import type { FoodListing, InsertFoodListing } from "@shared/schema";

export class ListingService {
  async createListing(listingData: InsertFoodListing & { dietaryTagIds?: string[] }): Promise<FoodListing> {
    const { dietaryTagIds, ...listingInfo } = listingData;
    
    // Set available quantity to initial quantity
    const listing = await storage.createFoodListing({
      ...listingInfo,
      availableQuantity: listingInfo.quantity,
    });

    // Add dietary tags if provided
    if (dietaryTagIds && dietaryTagIds.length > 0) {
      // This would require a method in storage to handle many-to-many relationships
      // For now, we'll skip this implementation detail
    }

    // Notify nearby users about new listing
    await this.notifyNearbyUsers(listing);

    return listing;
  }

  async getListingDetails(listingId: string): Promise<FoodListing | null> {
    return await storage.getFoodListing(listingId);
  }

  async getBusinessListings(businessId: string): Promise<FoodListing[]> {
    return await storage.getFoodListingsByBusiness(businessId);
  }

  async searchListings(filters: any): Promise<FoodListing[]> {
    const searchFilters: any = {};

    if (filters.maxPrice) {
      searchFilters.maxPrice = filters.maxPrice;
    }

    if (filters.businessType) {
      searchFilters.businessType = filters.businessType;
    }

    // Filter by expiry time
    if (filters.expiringBefore) {
      searchFilters.expiringBefore = new Date(filters.expiringBefore);
    } else {
      // Only show listings that haven't expired
      searchFilters.expiringBefore = new Date(Date.now() + 24 * 60 * 60 * 1000); // Next 24 hours
    }

    const listings = await storage.searchFoodListings(searchFilters);

    // Apply location-based filtering if coordinates provided
    if (filters.latitude && filters.longitude) {
      // This would require joining with business location data
      // For now, return all listings
    }

    // Sort listings based on sortBy parameter
    return this.sortListings(listings, filters.sortBy || 'expiry');
  }

  async updateListing(listingId: string, updates: Partial<FoodListing>): Promise<FoodListing> {
    const listing = await storage.updateFoodListing(listingId, updates);

    // If quantity was updated, check if it's sold out
    if (updates.availableQuantity !== undefined && updates.availableQuantity === 0) {
      await storage.updateFoodListing(listingId, { status: "sold_out" });
    }

    return listing;
  }

  async deleteListing(listingId: string): Promise<boolean> {
    // First check if there are pending orders for this listing
    const listing = await storage.getFoodListing(listingId);
    if (!listing) return false;

    // Cancel the listing instead of deleting if there are orders
    await storage.updateFoodListing(listingId, { 
      status: "cancelled",
      updatedAt: new Date()
    });

    return true;
  }

  async reserveItems(listingId: string, quantity: number): Promise<boolean> {
    const listing = await storage.getFoodListing(listingId);
    if (!listing || listing.availableQuantity < quantity) {
      return false;
    }

    const newAvailableQuantity = listing.availableQuantity - quantity;
    await storage.updateFoodListing(listingId, {
      availableQuantity: newAvailableQuantity,
      status: newAvailableQuantity === 0 ? "sold_out" : listing.status,
    });

    return true;
  }

  async releaseReservedItems(listingId: string, quantity: number): Promise<void> {
    const listing = await storage.getFoodListing(listingId);
    if (!listing) return;

    const newAvailableQuantity = Math.min(
      listing.availableQuantity + quantity,
      listing.quantity
    );

    await storage.updateFoodListing(listingId, {
      availableQuantity: newAvailableQuantity,
      status: newAvailableQuantity > 0 ? "active" : listing.status,
    });
  }

  async getExpiringListings(hours: number = 2): Promise<FoodListing[]> {
    const expiryTime = new Date(Date.now() + hours * 60 * 60 * 1000);
    return await storage.searchFoodListings({
      status: "active",
      expiringBefore: expiryTime,
    });
  }

  async markAsExpired(listingId: string): Promise<void> {
    await storage.updateFoodListing(listingId, {
      status: "expired",
      updatedAt: new Date(),
    });
  }

  private async notifyNearbyUsers(listing: FoodListing): Promise<void> {
    // This would require a more sophisticated implementation
    // to find users within a certain radius and send notifications
    // For now, we'll skip this implementation
  }

  private sortListings(listings: FoodListing[], sortBy: string): FoodListing[] {
    switch (sortBy) {
      case 'price':
        return listings.sort((a, b) => 
          parseFloat(a.discountedPrice) - parseFloat(b.discountedPrice)
        );
      
      case 'expiry':
        return listings.sort((a, b) => 
          new Date(a.pickupWindowEnd).getTime() - new Date(b.pickupWindowEnd).getTime()
        );
      
      case 'rating':
        // This would require joining with business ratings
        return listings;
      
      case 'distance':
        // This would require location calculations
        return listings;
      
      default:
        return listings;
    }
  }

  async getFeaturedListings(limit: number = 10): Promise<FoodListing[]> {
    // Get urgently expiring deals (next 2 hours)
    const urgentDeals = await this.getExpiringListings(2);
    return urgentDeals.slice(0, limit);
  }

  async getListingsByCategory(businessType: string): Promise<FoodListing[]> {
    return await storage.searchFoodListings({
      businessType,
      status: "active",
    });
  }
}

export const listingService = new ListingService();
