import { storage } from "../storage";
import type { BusinessAnalytics } from "@shared/schema";

export class ImpactService {
  async getUserImpact(userId: string): Promise<any> {
    const impact = await storage.getUserImpactStats(userId);
    const user = await storage.getUser(userId);
    
    // Calculate additional metrics
    const co2SavedPerMeal = 1.2; // kg CO2 per meal rescued (estimated)
    const wastePerMeal = 0.8; // kg food waste per meal (estimated)
    
    return {
      totalMealsRescued: impact.totalMealsRescued || 0,
      totalMoneySaved: parseFloat(impact.totalMoneySaved || "0"),
      totalCo2Saved: (impact.totalMealsRescued || 0) * co2SavedPerMeal,
      totalWastePrevented: (impact.totalMealsRescued || 0) * wastePerMeal,
      pointsEarned: user?.pointsBalance || 0,
      carbonFootprintReduction: this.calculateCarbonFootprintReduction(impact.totalMealsRescued || 0),
      monthlyTrend: await this.getUserMonthlyTrend(userId),
      achievements: await this.getUserAchievements(userId),
      rank: await this.getUserRank(userId),
    };
  }

  async getBusinessAnalytics(
    businessId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const analytics = await storage.getBusinessAnalytics(businessId, startDate, endDate);
    const business = await storage.getBusiness(businessId);
    
    // Get current period data
    const orders = await storage.getOrdersByBusiness(businessId);
    const listings = await storage.getFoodListingsByBusiness(businessId);
    const reviews = await storage.getReviewsByBusiness(businessId);
    
    // Calculate metrics
    const completedOrders = orders.filter(o => o.status === "completed");
    const totalRevenue = completedOrders.reduce((sum, order) => 
      sum + parseFloat(order.totalAmount), 0
    );
    
    const activeListings = listings.filter(l => l.status === "active");
    const totalListings = listings.length;
    
    // Calculate food waste metrics
    const totalItemsSold = completedOrders.length * 2; // Estimate 2 items per order
    const estimatedFoodWasteSaved = totalItemsSold * 0.8; // kg
    const estimatedCo2Saved = totalItemsSold * 1.2; // kg CO2
    
    // Calculate efficiency metrics
    const listingConversionRate = completedOrders.length / Math.max(totalListings, 1);
    const averageOrderValue = totalRevenue / Math.max(completedOrders.length, 1);
    
    return {
      businessId,
      businessName: business?.businessName,
      period: { startDate, endDate },
      
      // Revenue metrics
      totalRevenue,
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      averageOrderValue,
      
      // Listing metrics
      totalListings,
      activeListings: activeListings.length,
      soldOutListings: listings.filter(l => l.status === "sold_out").length,
      listingConversionRate: parseFloat((listingConversionRate * 100).toFixed(1)),
      
      // Impact metrics
      totalMealsRescued: totalItemsSold,
      foodWasteSaved: estimatedFoodWasteSaved,
      co2Saved: estimatedCo2Saved,
      wasteReductionPercentage: await this.calculateWasteReduction(businessId),
      
      // Customer metrics
      totalCustomers: await this.getUniqueCustomerCount(businessId),
      repeatCustomers: await this.getRepeatCustomerCount(businessId),
      customerRetentionRate: await this.getCustomerRetentionRate(businessId),
      
      // Rating metrics
      averageRating: parseFloat(business?.averageRating || "0"),
      totalReviews: reviews.length,
      ratingTrend: await this.getRatingTrend(businessId),
      
      // Time-based analytics
      peakHours: await this.getPeakHours(businessId),
      bestPerformingDays: await this.getBestPerformingDays(businessId),
      
      // Comparative metrics
      industryBenchmark: await this.getIndustryBenchmark(business?.businessType || "restaurant"),
      competitorComparison: await this.getCompetitorComparison(businessId),
    };
  }

  async getGlobalImpactStats(): Promise<any> {
    // This would require aggregating across all users and businesses
    return {
      totalMealsRescued: 12847,
      totalCo2Saved: 24.3, // tonnes
      totalBusinesses: 340,
      totalUsers: 8920,
      totalMoneySaved: 2400000, // ₦2.4M
      wasteReductionPercentage: 23.5,
      topPerformingCities: [
        { city: "Lagos", mealsRescued: 8450 },
        { city: "Abuja", mealsRescued: 2100 },
        { city: "Port Harcourt", mealsRescued: 1800 },
      ],
      growthRate: {
        mealsRescued: 15.2, // % growth month over month
        newBusinesses: 8.7,
        newUsers: 12.3,
      }
    };
  }

  async getUserMonthlyTrend(userId: string): Promise<any[]> {
    const orders = await storage.getOrdersByUser(userId);
    const completedOrders = orders.filter(o => o.status === "completed");
    
    // Group by month for the last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthOrders = completedOrders.filter(order => {
        const orderDate = new Date(order.createdAt!);
        const orderMonth = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        return orderMonth === monthKey;
      });
      
      months.push({
        month: monthKey,
        mealsRescued: monthOrders.length * 2, // Estimate 2 items per order
        moneySaved: monthOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
        co2Saved: monthOrders.length * 2 * 1.2, // kg CO2
      });
    }
    
    return months;
  }

  async getUserAchievements(userId: string): Promise<any[]> {
    const user = await storage.getUser(userId);
    const impact = await storage.getUserImpactStats(userId);
    
    const achievements = [];
    
    // Meal rescue achievements
    if ((impact.totalMealsRescued || 0) >= 1) achievements.push({
      id: "first_rescue",
      title: "First Rescue",
      description: "Rescued your first meal",
      icon: "🎉",
      unlockedAt: user?.createdAt,
    });
    
    if ((impact.totalMealsRescued || 0) >= 10) achievements.push({
      id: "rescue_warrior",
      title: "Rescue Warrior",
      description: "Rescued 10 meals",
      icon: "⚡",
      unlockedAt: user?.createdAt,
    });
    
    if ((impact.totalMealsRescued || 0) >= 50) achievements.push({
      id: "eco_champion",
      title: "Eco Champion",
      description: "Rescued 50 meals",
      icon: "🌱",
      unlockedAt: user?.createdAt,
    });
    
    // CO2 savings achievements
    const co2Saved = (impact.totalMealsRescued || 0) * 1.2;
    if (co2Saved >= 10) achievements.push({
      id: "carbon_saver",
      title: "Carbon Saver",
      description: "Saved 10kg of CO₂",
      icon: "🌍",
      unlockedAt: user?.createdAt,
    });
    
    // Streak achievements
    // This would require tracking daily/weekly streaks
    
    return achievements;
  }

  async getUserRank(userId: string): Promise<any> {
    // This would require comparing user's impact with all other users
    return {
      position: 1250,
      totalUsers: 8920,
      percentile: 86,
      badge: "Eco Warrior",
      nextRank: {
        title: "Planet Protector",
        mealsNeeded: 15,
      }
    };
  }

  async generateImpactReport(
    entityType: "user" | "business",
    entityId: string,
    period: "month" | "quarter" | "year"
  ): Promise<any> {
    if (entityType === "user") {
      return await this.generateUserImpactReport(entityId, period);
    } else {
      return await this.generateBusinessImpactReport(entityId, period);
    }
  }

  private async generateUserImpactReport(userId: string, period: "month" | "quarter" | "year"): Promise<any> {
    const impact = await this.getUserImpact(userId);
    const user = await storage.getUser(userId);
    
    return {
      reportType: "user_impact",
      userId,
      userName: user?.fullName,
      period,
      generatedAt: new Date(),
      summary: {
        mealsRescued: impact.totalMealsRescued,
        moneySaved: impact.totalMoneySaved,
        co2Saved: impact.totalCo2Saved,
        wasteReduced: impact.totalWastePrevented,
      },
      comparison: {
        equivalent: {
          treesPlanted: Math.round(impact.totalCo2Saved / 22), // 22kg CO2 per tree per year
          kmDriving: Math.round(impact.totalCo2Saved * 4.6), // 2.3kg CO2 per km
          plasticBottlesSaved: Math.round(impact.totalMealsRescued * 3), // Estimate
        }
      },
      achievements: impact.achievements,
      recommendations: [
        "Try rescuing breakfast items for variety",
        "Share your impact on social media",
        "Invite friends to join Looper"
      ]
    };
  }

  private async generateBusinessImpactReport(businessId: string, period: "month" | "quarter" | "year"): Promise<any> {
    const analytics = await this.getBusinessAnalytics(businessId);
    
    return {
      reportType: "business_impact",
      businessId,
      businessName: analytics.businessName,
      period,
      generatedAt: new Date(),
      
      operationalMetrics: {
        totalListings: analytics.totalListings,
        completedOrders: analytics.completedOrders,
        revenue: analytics.totalRevenue,
        conversionRate: analytics.listingConversionRate,
      },
      
      impactMetrics: {
        mealsRescued: analytics.totalMealsRescued,
        wasteReduced: analytics.foodWasteSaved,
        co2Saved: analytics.co2Saved,
        wasteReductionPercentage: analytics.wasteReductionPercentage,
      },
      
      customerMetrics: {
        totalCustomers: analytics.totalCustomers,
        repeatCustomers: analytics.repeatCustomers,
        retentionRate: analytics.customerRetentionRate,
        averageRating: analytics.averageRating,
      },
      
      financialImpact: {
        additionalRevenue: analytics.totalRevenue,
        costsAvoided: analytics.foodWasteSaved * 500, // ₦500 per kg disposal cost
        netBenefit: analytics.totalRevenue - (analytics.foodWasteSaved * 200), // Minus food cost
      },
      
      recommendations: await this.getBusinessRecommendations(businessId),
    };
  }

  private calculateCarbonFootprintReduction(mealsRescued: number): string {
    const co2Saved = mealsRescued * 1.2; // kg
    const equivalentKmDriving = co2Saved * 4.6;
    return `Equivalent to ${Math.round(equivalentKmDriving)} km less driving`;
  }

  private async calculateWasteReduction(businessId: string): Promise<number> {
    // This would calculate actual waste reduction percentage
    // For now, return an estimate
    return 25.8;
  }

  private async getUniqueCustomerCount(businessId: string): Promise<number> {
    const orders = await storage.getOrdersByBusiness(businessId);
    const uniqueCustomers = new Set(orders.map(o => o.userId).filter(Boolean));
    return uniqueCustomers.size;
  }

  private async getRepeatCustomerCount(businessId: string): Promise<number> {
    const orders = await storage.getOrdersByBusiness(businessId);
    const customerOrderCounts = orders.reduce((acc, order) => {
      if (order.userId) {
        acc[order.userId] = (acc[order.userId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return Object.values(customerOrderCounts).filter(count => count > 1).length;
  }

  private async getCustomerRetentionRate(businessId: string): Promise<number> {
    const totalCustomers = await this.getUniqueCustomerCount(businessId);
    const repeatCustomers = await this.getRepeatCustomerCount(businessId);
    
    return totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
  }

  private async getRatingTrend(businessId: string): Promise<string> {
    // This would analyze rating changes over time
    return "improving"; // "improving", "declining", "stable"
  }

  private async getPeakHours(businessId: string): Promise<string[]> {
    // This would analyze order times to find peak hours
    return ["12:00-14:00", "18:00-20:00"];
  }

  private async getBestPerformingDays(businessId: string): Promise<string[]> {
    // This would analyze order days to find best performing days
    return ["Friday", "Saturday", "Sunday"];
  }

  private async getIndustryBenchmark(businessType: string): Promise<any> {
    // This would provide industry-specific benchmarks
    return {
      averageRating: 4.2,
      conversionRate: 15.8,
      customerRetention: 32.5,
    };
  }

  private async getCompetitorComparison(businessId: string): Promise<any> {
    // This would compare with similar businesses in the area
    return {
      ratingPosition: "Top 25%",
      conversionPosition: "Above average",
      popularityTrend: "Growing",
    };
  }

  private async getBusinessRecommendations(businessId: string): Promise<string[]> {
    const analytics = await this.getBusinessAnalytics(businessId);
    const recommendations = [];
    
    if (analytics.conversionRate < 15) {
      recommendations.push("Consider offering larger discounts to improve conversion rate");
    }
    
    if (analytics.averageRating < 4.0) {
      recommendations.push("Focus on improving food quality and packaging based on customer feedback");
    }
    
    if (analytics.customerRetentionRate < 30) {
      recommendations.push("Implement a loyalty program to increase repeat customers");
    }
    
    recommendations.push("List items during peak hours (12-2 PM and 6-8 PM) for better visibility");
    
    return recommendations;
  }
}

export const impactService = new ImpactService();
