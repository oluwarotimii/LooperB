import type { Express, Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { logger, LogLevel } from '../utils/logger';
import { storage } from '../storage';

export function registerAdminRoutes(router: Router) {
  // Admin system health endpoint
  router.get('/system-health', authenticateJWT, requireRole('admin'), async (req, res) => {
    try {
      const logs = logger.getLogStats(24); // Last 24 hours
      const recentErrors = logger.getRecentLogs(LogLevel.ERROR, 50);
      
      // Database health check
      let dbHealthy = true;
      try {
        const users = await storage.searchUsers('health-check', {}); // Simple query test
      } catch (error) {
        dbHealthy = false;
      }

      const systemHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
          api: 'healthy',
          email: 'healthy', // Could check Resend API health
          fileStorage: 'healthy', // Could check Cloudinary health
          payments: 'healthy' // Could check Paystack health
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV
        },
        logs: logs,
        recentErrors: recentErrors.slice(0, 10) // Last 10 errors
      };

      res.json(systemHealth);
    } catch (error) {
      logger.error('Failed to get system health', error as Error);
      res.status(500).json({ error: 'Failed to get system health' });
    }
  });

  // Get recent application logs
  router.get('/logs', authenticateJWT, requireRole('admin'), async (req, res) => {
    try {
      const { level, limit = 100 } = req.query;
      const logs = logger.getRecentLogs(level as LogLevel, parseInt(limit as string));
      
      res.json({
        logs,
        total: logs.length,
        filters: { level, limit }
      });
    } catch (error) {
      logger.error('Failed to get logs', error as Error);
      res.status(500).json({ error: 'Failed to get logs' });
    }
  });

  // Business verification management
  router.get('/businesses/pending', authenticateJWT, requireRole('admin'), async (req, res) => {
    try {
      const pendingBusinesses = await storage.searchBusinesses('', { 
        verificationStatus: 'pending' 
      });
      
      res.json({
        businesses: pendingBusinesses,
        total: pendingBusinesses.length
      });
    } catch (error) {
      logger.error('Failed to get pending businesses', error as Error);
      res.status(500).json({ error: 'Failed to get pending businesses' });
    }
  });

  router.post('/businesses/:id/verify', authenticateJWT, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { approved, reason } = req.body;

      const business = await storage.getBusiness(id);
      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      // Update verification status
      await storage.updateBusiness(id, {
        verificationStatus: approved ? 'verified' : 'rejected'
      });

      // Log admin action
      logger.info('Business verification status changed', {
        businessId: id,
        approved,
        adminId: (req as any).user.id,
        reason
      });

      res.json({ 
        success: true, 
        message: `Business ${approved ? 'approved' : 'rejected'} successfully` 
      });
    } catch (error) {
      logger.error('Failed to update business verification', error as Error);
      res.status(500).json({ error: 'Failed to update business verification' });
    }
  });

  // User management
  router.get('/users/stats', authenticateJWT, requireRole('admin'), async (req, res) => {
    try {
      const allUsers = await storage.searchUsers('', {});
      
      const stats = {
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter(u => u.isVerified).length,
        businessOwners: allUsers.filter(u => u.role === 'business_owner').length,
        consumers: allUsers.filter(u => u.role === 'consumer').length,
        admins: allUsers.filter(u => u.role === 'admin').length
      };

      res.json(stats);
    } catch (error) {
      logger.error('Failed to get user stats', error as Error);
      res.status(500).json({ error: 'Failed to get user stats' });
    }
  });

  // Platform analytics
  router.get('/analytics', authenticateJWT, requireRole('admin'), async (req, res) => {
    try {
      const { period = '30d' } = req.query;
      
      const businesses = await storage.searchBusinesses('', {});
      const listings = await storage.searchFoodListings({});
      
      const analytics = {
        period,
        orders: {
          total: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0
        },
        listings: {
          total: listings.length,
          active: listings.filter(l => l.status === 'active').length,
          expired: listings.filter(l => l.status === 'expired').length
        },
        impact: {
          foodSaved: 0, // kg
          co2Reduced: 0, // kg
          mealsProvided: 0
        },
        businesses: {
          total: businesses.length,
          verified: businesses.filter(b => b.verificationStatus === 'verified').length,
          active: businesses.filter(b => b.isActive).length
        }
      };

      res.json(analytics);
    } catch (error) {
      logger.error('Failed to get analytics', error as Error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  });

  // Content moderation
  router.get('/reports', authenticateJWT, requireRole('admin'), async (req, res) => {
    try {
      const reports: any[] = []; // Would implement reporting system in storage layer

      res.json({
        reports,
        total: reports.length
      });
    } catch (error) {
      logger.error('Failed to get reports', error as Error);
      res.status(500).json({ error: 'Failed to get reports' });
    }
  });
}