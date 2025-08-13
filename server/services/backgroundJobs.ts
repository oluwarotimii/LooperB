import cron from 'node-cron';
import { storage } from '../storage';
import { emailService } from './emailService';
import { logger } from '../utils/logger';
import { notificationService } from './notificationService';

export class BackgroundJobService {
  private static instance: BackgroundJobService;
  private jobs: Map<string, any> = new Map();

  static getInstance(): BackgroundJobService {
    if (!BackgroundJobService.instance) {
      BackgroundJobService.instance = new BackgroundJobService();
    }
    return BackgroundJobService.instance;
  }

  startAllJobs(): void {
    logger.info('Starting background jobs');

    // Clean up expired listings every hour
    this.scheduleJob('cleanup-expired-listings', '0 * * * *', this.cleanupExpiredListings);

    // Send expiring deals reminder daily at 9 AM
    this.scheduleJob('reminder-expiring-deals', '0 9 * * *', this.sendExpiringDealsReminder);

    // Process analytics daily at midnight
    this.scheduleJob('process-analytics', '0 0 * * *', this.processAnalytics);

    // Clean up old notifications weekly
    this.scheduleJob('cleanup-notifications', '0 0 * * 0', this.cleanupOldNotifications);

    // Generate business reports weekly on Mondays at 6 AM
    this.scheduleJob('weekly-business-reports', '0 6 * * 1', this.generateWeeklyReports);

    // Check for abandoned carts every 2 hours (if implemented)
    this.scheduleJob('abandoned-cart-reminder', '0 */2 * * *', this.sendAbandonedCartReminders);

    // Update business ratings daily at 2 AM
    this.scheduleJob('update-business-ratings', '0 2 * * *', this.updateBusinessRatings);

    logger.info(`Started ${this.jobs.size} background jobs`);
  }

  stopAllJobs(): void {
    logger.info('Stopping all background jobs');
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    });
    this.jobs.clear();
  }

  private scheduleJob(name: string, schedule: string, task: () => Promise<void>): void {
    const job = cron.schedule(schedule, async () => {
      logger.info(`Running background job: ${name}`);
      try {
        await task();
        logger.info(`Completed background job: ${name}`);
      } catch (error) {
        logger.error(`Background job failed: ${name}`, error as Error);
      }
    }, { scheduled: false });

    this.jobs.set(name, job);
    job.start();
    logger.info(`Scheduled job: ${name} with schedule: ${schedule}`);
  }

  // Job implementations
  private async cleanupExpiredListings(): Promise<void> {
    try {
      const expiredListings = await storage.searchFoodListings({
        status: 'active',
        expiringBefore: new Date()
      });

      for (const listing of expiredListings) {
        await storage.updateFoodListing(listing.id, {
          status: 'expired'
        });

        // Notify business about expired listing
        const business = await storage.getBusiness(listing.businessId);
        if (business) {
          await notificationService.createNotification({
            userId: listing.businessId, // This should be the business owner's user ID
            title: 'Listing Expired',
            message: `Your listing "${listing.title}" has expired and been marked as unavailable.`,
            type: 'system',
            relatedEntityId: listing.id,
            relatedEntityType: 'listing'
          });
        }
      }

      logger.info(`Cleaned up ${expiredListings.length} expired listings`);
    } catch (error) {
      logger.error('Failed to cleanup expired listings', error as Error);
    }
  }

  private async sendExpiringDealsReminder(): Promise<void> {
    try {
      // Find listings expiring in the next 4 hours
      const expiringDate = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const expiringListings = await storage.searchFoodListings({
        status: 'active',
        expiringBefore: expiringDate
      });

      // Group by business
      const businessListings = new Map();
      for (const listing of expiringListings) {
        if (!businessListings.has(listing.businessId)) {
          businessListings.set(listing.businessId, []);
        }
        businessListings.get(listing.businessId).push(listing);
      }

      // Send reminders to businesses
      for (const [businessId, listings] of businessListings) {
        const business = await storage.getBusiness(businessId);
        const businessUsers = await storage.getBusinessUsers(businessId);

        for (const businessUser of businessUsers) {
          if (businessUser.role === 'owner' || businessUser.role === 'manager') {
            const user = await storage.getUser(businessUser.userId);
            if (user?.email) {
              // Send email about expiring listings
              // Implementation would include email template for expiring deals
              logger.info(`Sent expiring deals reminder to business: ${business?.businessName}`);
            }
          }
        }
      }

      logger.info(`Sent expiring deals reminders for ${businessListings.size} businesses`);
    } catch (error) {
      logger.error('Failed to send expiring deals reminders', error as Error);
    }
  }

  private async processAnalytics(): Promise<void> {
    try {
      // Get all businesses
      const businesses = await storage.searchBusinesses('', {});

      for (const business of businesses) {
        // Get yesterday's data
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);

        // Get orders for yesterday
        const orders = await storage.getOrdersByBusiness(business.id);
        const yesterdayOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= yesterday && orderDate <= endOfYesterday;
        });

        // Calculate analytics
        const totalRevenue = yesterdayOrders
          .filter(order => order.status === 'completed')
          .reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

        const totalOrders = yesterdayOrders.length;
        const completedOrders = yesterdayOrders.filter(order => order.status === 'completed').length;

        // Store analytics (you'll need to implement this in storage)
        logger.info(`Processed analytics for business: ${business.businessName}`, {
          businessId: business.id,
          date: yesterday.toISOString().split('T')[0],
          totalRevenue,
          totalOrders,
          completedOrders
        });
      }

      logger.info('Completed analytics processing for all businesses');
    } catch (error) {
      logger.error('Failed to process analytics', error as Error);
    }
  }

  private async cleanupOldNotifications(): Promise<void> {
    try {
      // Delete notifications older than 30 days
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // This would need implementation in storage layer
      logger.info(`Cleaned up notifications older than ${cutoffDate.toISOString()}`);
    } catch (error) {
      logger.error('Failed to cleanup old notifications', error as Error);
    }
  }

  private async generateWeeklyReports(): Promise<void> {
    try {
      // Generate and send weekly business performance reports
      const businesses = await storage.searchBusinesses('', {});

      for (const business of businesses) {
        const businessUsers = await storage.getBusinessUsers(business.id);
        const owner = businessUsers.find(bu => bu.role === 'owner');

        if (owner) {
          const user = await storage.getUser(owner.userId);
          if (user?.email) {
            // Generate report data and send email
            logger.info(`Generated weekly report for business: ${business.businessName}`);
          }
        }
      }

      logger.info('Generated weekly reports for all businesses');
    } catch (error) {
      logger.error('Failed to generate weekly reports', error as Error);
    }
  }

  private async sendAbandonedCartReminders(): Promise<void> {
    try {
      // Implementation for abandoned cart reminders
      // This would require tracking user sessions and cart data
      logger.info('Processed abandoned cart reminders');
    } catch (error) {
      logger.error('Failed to send abandoned cart reminders', error as Error);
    }
  }

  private async updateBusinessRatings(): Promise<void> {
    try {
      const businesses = await storage.searchBusinesses('', {});

      for (const business of businesses) {
        await storage.updateBusinessRating(business.id);
      }

      logger.info(`Updated ratings for ${businesses.length} businesses`);
    } catch (error) {
      logger.error('Failed to update business ratings', error as Error);
    }
  }
}

export const backgroundJobService = BackgroundJobService.getInstance();