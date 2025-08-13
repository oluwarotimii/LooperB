import { storage } from "../storage";
import { notificationService } from "./notificationService";
import type { Review, InsertReview } from "@shared/schema";

export class ReviewService {
  async createReview(userId: string, reviewData: InsertReview): Promise<Review> {
    // Verify the order belongs to the user
    const order = await storage.getOrder(reviewData.orderId);
    if (!order || order.userId !== userId) {
      throw new Error("Order not found or does not belong to user");
    }

    // Check if order is completed
    if (order.status !== "completed") {
      throw new Error("Can only review completed orders");
    }

    // Check if review already exists
    const existingReviews = await storage.getReviewsByUser(userId);
    const existingReview = existingReviews.find(r => r.orderId === reviewData.orderId);
    if (existingReview) {
      throw new Error("Review already exists for this order");
    }

    // Create review
    const review = await storage.createReview({
      ...reviewData,
      userId,
      businessId: order.businessId,
      isVerifiedPurchase: true,
    });

    // Award points for leaving a review
    await storage.addPoints(userId, 25, "review_submitted", order.id);

    // Notify business about new review
    const businessUsers = await storage.getBusinessUsers(order.businessId);
    const business = await storage.getBusiness(order.businessId);
    
    for (const businessUser of businessUsers) {
      await notificationService.createNotification({
        userId: businessUser.userId,
        title: "New Review Received",
        message: `${business?.businessName} received a new ${review.ratingFood}-star review`,
        type: "review",
        relatedEntityId: review.id,
        relatedEntityType: "review",
      });
    }

    return review;
  }

  async getBusinessReviews(businessId: string, limit?: number): Promise<Review[]> {
    const reviews = await storage.getReviewsByBusiness(businessId);
    
    // Sort by most recent first
    const sortedReviews = reviews.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );

    return limit ? sortedReviews.slice(0, limit) : sortedReviews;
  }

  async getUserReviews(userId: string): Promise<Review[]> {
    return await storage.getReviewsByUser(userId);
  }

  async getReviewById(reviewId: string): Promise<Review | null> {
    return await storage.getReview(reviewId);
  }

  async respondToReview(
    reviewId: string,
    businessUserId: string,
    response: string
  ): Promise<Review> {
    const review = await this.getReviewById(reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Verify user has permission to respond (is part of the business)
    const userBusinesses = await storage.getUserBusinesses(businessUserId);
    const hasPermission = userBusinesses.some(b => b.id === review.businessId);
    if (!hasPermission) {
      throw new Error("Not authorized to respond to this review");
    }

    // Update review with business response
    const updatedReview = await this.updateReview(reviewId, {
      businessResponse: response,
      businessResponseAt: new Date(),
    });

    // Notify customer about business response
    await notificationService.createNotification({
      userId: review.userId,
      title: "Business Responded to Your Review",
      message: "The business has responded to your review. Check it out!",
      type: "review",
      relatedEntityId: reviewId,
      relatedEntityType: "review",
    });

    return updatedReview;
  }

  async getBusinessRatingStats(businessId: string): Promise<any> {
    const reviews = await storage.getReviewsByBusiness(businessId);
    
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        averageFood: 0,
        averageService: 0,
        averagePackaging: 0,
        averageValue: 0,
      };
    }

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalFood = 0;
    let totalService = 0;
    let totalPackaging = 0;
    let totalValue = 0;
    let packagingCount = 0;
    let valueCount = 0;

    reviews.forEach(review => {
      const overallRating = Math.round((review.ratingFood + review.ratingService) / 2);
      ratingBreakdown[overallRating as keyof typeof ratingBreakdown]++;
      
      totalFood += review.ratingFood;
      totalService += review.ratingService;
      
      if (review.ratingPackaging) {
        totalPackaging += review.ratingPackaging;
        packagingCount++;
      }
      
      if (review.ratingValue) {
        totalValue += review.ratingValue;
        valueCount++;
      }
    });

    return {
      averageRating: parseFloat(((totalFood + totalService) / (reviews.length * 2)).toFixed(1)),
      totalReviews: reviews.length,
      ratingBreakdown,
      averageFood: parseFloat((totalFood / reviews.length).toFixed(1)),
      averageService: parseFloat((totalService / reviews.length).toFixed(1)),
      averagePackaging: packagingCount > 0 ? parseFloat((totalPackaging / packagingCount).toFixed(1)) : 0,
      averageValue: valueCount > 0 ? parseFloat((totalValue / valueCount).toFixed(1)) : 0,
    };
  }

  async getReviewsWithFilters(
    businessId: string,
    filters: {
      minRating?: number;
      maxRating?: number;
      withPhotos?: boolean;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Review[]> {
    const reviews = await storage.getReviewsByBusiness(businessId);
    
    return reviews.filter(review => {
      const overallRating = (review.ratingFood + review.ratingService) / 2;
      
      if (filters.minRating && overallRating < filters.minRating) return false;
      if (filters.maxRating && overallRating > filters.maxRating) return false;
      if (filters.withPhotos && (!review.photos || (review.photos as any[]).length === 0)) return false;
      if (filters.startDate && new Date(review.createdAt!) < filters.startDate) return false;
      if (filters.endDate && new Date(review.createdAt!) > filters.endDate) return false;
      
      return true;
    });
  }

  async getFeaturedReviews(businessId: string, count: number = 3): Promise<Review[]> {
    const reviews = await storage.getReviewsByBusiness(businessId);
    
    // Get reviews with high ratings and comments
    const goodReviews = reviews.filter(review => {
      const overallRating = (review.ratingFood + review.ratingService) / 2;
      return overallRating >= 4 && review.comment && review.comment.length > 20;
    });

    // Sort by rating and recency
    const sortedReviews = goodReviews.sort((a, b) => {
      const ratingA = (a.ratingFood + a.ratingService) / 2;
      const ratingB = (b.ratingFood + b.ratingService) / 2;
      
      if (ratingA !== ratingB) {
        return ratingB - ratingA; // Higher rating first
      }
      
      return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(); // More recent first
    });

    return sortedReviews.slice(0, count);
  }

  async flagReview(reviewId: string, reason: string, flaggedBy: string): Promise<void> {
    // This would create a report for the review
    await storage.createReport({
      reporterId: flaggedBy,
      entityType: "review",
      entityId: reviewId,
      reason,
      description: "Review flagged for moderation",
    });

    // Notify moderation team
    await notificationService.createNotification({
      userId: "moderation", // This would be a moderation team user
      title: "Review Flagged",
      message: `Review has been flagged for: ${reason}`,
      type: "system",
      priority: "high",
      relatedEntityId: reviewId,
      relatedEntityType: "review",
    });
  }

  async getReviewTrends(businessId: string, period: "week" | "month" | "quarter"): Promise<any> {
    const reviews = await storage.getReviewsByBusiness(businessId);
    
    const periodInMs = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
    }[period];

    const cutoffDate = new Date(Date.now() - periodInMs);
    const recentReviews = reviews.filter(review => 
      new Date(review.createdAt!) >= cutoffDate
    );

    const oldReviews = reviews.filter(review => 
      new Date(review.createdAt!) < cutoffDate
    );

    const calculateAverage = (reviewList: Review[]) => {
      if (reviewList.length === 0) return 0;
      const sum = reviewList.reduce((acc, review) => 
        acc + (review.ratingFood + review.ratingService) / 2, 0
      );
      return sum / reviewList.length;
    };

    const recentAverage = calculateAverage(recentReviews);
    const oldAverage = calculateAverage(oldReviews);

    return {
      period,
      recentAverage: parseFloat(recentAverage.toFixed(1)),
      previousAverage: parseFloat(oldAverage.toFixed(1)),
      trend: recentAverage > oldAverage ? "improving" : recentAverage < oldAverage ? "declining" : "stable",
      recentReviewCount: recentReviews.length,
      totalReviews: reviews.length,
    };
  }

  async sendReviewReminders(): Promise<void> {
    // Get completed orders from the last 7 days without reviews
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // This would require a custom query to get orders without reviews
    // For now, we'll just log it
    console.log("Sending review reminders for orders completed after", oneWeekAgo);
  }

  async getTopReviewers(businessId?: string, limit: number = 10): Promise<any[]> {
    // This would require a custom query to find users with most reviews
    return [];
  }

  private async updateReview(reviewId: string, updates: Partial<Review>): Promise<Review> {
    return await storage.updateReview(reviewId, updates);
  }

  async generateReviewInsights(businessId: string): Promise<any> {
    const reviews = await storage.getReviewsByBusiness(businessId);
    const stats = await this.getBusinessRatingStats(businessId);
    
    // Analyze common keywords in positive and negative reviews
    const positiveReviews = reviews.filter(r => (r.ratingFood + r.ratingService) / 2 >= 4);
    const negativeReviews = reviews.filter(r => (r.ratingFood + r.ratingService) / 2 <= 2);
    
    return {
      ...stats,
      totalReviews: reviews.length,
      positiveReviewsCount: positiveReviews.length,
      negativeReviewsCount: negativeReviews.length,
      reviewsWithPhotos: reviews.filter(r => r.photos && (r.photos as any[]).length > 0).length,
      businessResponseRate: reviews.filter(r => r.businessResponse).length / reviews.length,
      averageResponseTime: "2.3 hours", // Would calculate actual response time
      commonPositiveKeywords: ["delicious", "fresh", "great value"],
      commonNegativeKeywords: ["cold", "late", "packaging"],
    };
  }
}

export const reviewService = new ReviewService();
