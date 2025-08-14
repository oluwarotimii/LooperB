import { storage } from "../storage";
import { notificationService } from "./notificationService";
import { geoLocationService } from "../utils/geoLocation";
import type { FoodListing, InsertFoodListing, Business } from "@shared/schema";

export class ListingService {
  async createListing(listingData: InsertFoodListing & { dietaryTagIds?: string[] }): Promise<FoodListing> {
    const { dietaryTagIds, ...listingInfo } = listingData;
    
    // Calculate dynamic discounted price
    const calculatedDiscountedPrice = this.calculateDynamicPrice(
      parseFloat(listingInfo.originalPrice),
      parseFloat(listingInfo.discountedPrice),
      listingInfo.quantity,
      listingInfo.minQuantityForDiscount || 1,
      parseFloat(listingInfo.bulkDiscountPercentage || "0"),
      new Date(listingInfo.pickupWindowEnd),
      listingInfo.peakPricingRules
    );

    // Set available quantity to initial quantity
    const listing = await storage.createFoodListing({
      ...listingInfo,
      availableQuantity: listingInfo.quantity,
      discountedPrice: calculatedDiscountedPrice.toString(),
    });

    // Add dietary tags if provided
    if (dietaryTagIds && dietaryTagIds.length > 0) {
      await storage.addListingDietaryTags(listing.id, dietaryTagIds);
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

  async findNearbyListings(
    lat: number,
    lon: number,
    radius: number = 10
  ): Promise<Array<FoodListing & { distance: number; business: Business }>> {
    if (!geoLocationService.validateCoordinates(lat, lon)) {
      throw new Error("Invalid coordinates provided.");
    }

    const nearbyBusinesses = await storage.findBusinessesNearby(lat, lon, radius);

    if (nearbyBusinesses.length === 0) {
      return [];
    }

    const businessIds = nearbyBusinesses.map((b) => b.id);
    const listings = await storage.getActiveListingsByBusinessIds(businessIds);

    const listingsWithDistance = listings.map((listing) => {
      const business = nearbyBusinesses.find((b) => b.id === listing.businessId)!;
      const distance = geoLocationService.calculateDistance(
        lat,
        lon,
        parseFloat(business.latitude!),
        parseFloat(business.longitude!)
      );
      return { ...listing, distance, business };
    });

    return listingsWithDistance.sort((a, b) => a.distance - b.distance);
  }

  async searchListings(filters: any): Promise<FoodListing[]> {
    const searchFilters: any = {};

    if (filters.q) {
      return await storage.searchFoodListingsFullText(filters.q, filters);
    }

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
    // Recalculate dynamic discounted price if relevant fields are updated
    if (updates.originalPrice || updates.quantity || updates.minQuantityForDiscount || updates.bulkDiscountPercentage || updates.pickupWindowEnd) {
      const existingListing = await storage.getFoodListing(listingId);
      if (existingListing) {
        const newOriginalPrice = parseFloat(updates.originalPrice?.toString() || existingListing.originalPrice);
        const newDiscountedPrice = parseFloat(updates.discountedPrice?.toString() || existingListing.discountedPrice);
        const newQuantity = updates.quantity || existingListing.quantity;
        const newMinQuantityForDiscount = updates.minQuantityForDiscount || existingListing.minQuantityForDiscount;
        const newBulkDiscountPercentage = parseFloat(updates.bulkDiscountPercentage?.toString() || existingListing.bulkDiscountPercentage);
        const newPickupWindowEnd = new Date(updates.pickupWindowEnd?.toString() || existingListing.pickupWindowEnd);
        const newPeakPricingRules = updates.peakPricingRules || existingListing.peakPricingRules;

        const calculatedDiscountedPrice = this.calculateDynamicPrice(
          newOriginalPrice,
          newDiscountedPrice,
          newQuantity,
          newMinQuantityForDiscount,
          newBulkDiscountPercentage,
          newPickupWindowEnd,
          newPeakPricingRules
        );
        updates.discountedPrice = calculatedDiscountedPrice.toString();
      }
    }

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

  private calculateDynamicPrice(
    originalPrice: number,
    currentDiscountedPrice: number,
    quantity: number,
    minQuantityForDiscount: number,
    bulkDiscountPercentage: number,
    pickupWindowEnd: Date,
    peakPricingRules?: any // New parameter for peak pricing
  ): number {
    let finalPrice = currentDiscountedPrice;

    // Time-based discount: higher discount closer to expiration
    const timeUntilExpiry = pickupWindowEnd.getTime() - Date.now(); // in milliseconds
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

    if (hoursUntilExpiry <= 1) {
      finalPrice = Math.min(finalPrice, originalPrice * 0.2); // 80% discount in last hour
    } else if (hoursUntilExpiry <= 3) {
      finalPrice = Math.min(finalPrice, originalPrice * 0.4); // 60% discount in last 3 hours
    } else if (hoursUntilExpiry <= 6) {
      finalPrice = Math.min(finalPrice, originalPrice * 0.6); // 40% discount in last 6 hours
    }

    // Quantity-based discount
    if (quantity >= minQuantityForDiscount && bulkDiscountPercentage > 0) {
      finalPrice = finalPrice * (1 - bulkDiscountPercentage / 100);
    }

    // Peak Time Pricing
    if (peakPricingRules) {
      const now = new Date();
      const currentDay = now.getDay(); // 0 for Sunday, 1 for Monday, etc.
      const currentHour = now.getHours();

      for (const rule of peakPricingRules) {
        if (rule.days.includes(currentDay)) {
          const [startHour, endHour] = rule.timeRange.split('-').map(Number);
          if (currentHour >= startHour && currentHour < endHour) {
            finalPrice = finalPrice * (1 + rule.surchargePercentage / 100);
            break; // Apply only one peak pricing rule
          }
        }
      }
    }

    return parseFloat(finalPrice.toFixed(2));
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
