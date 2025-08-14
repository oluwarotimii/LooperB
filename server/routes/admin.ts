import type { Express, Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { logger, LogLevel } from '../utils/logger';
import { storage } from '../storage';

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints for system management
 */

export function registerAdminRoutes(router: Router) {
  /**
   * @swagger
   * /api/admin/system-health:
   *   get:
   *     summary: Get system health
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: System health status
   */
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

  /**
   * @swagger
   * /api/admin/logs:
   *   get:
   *     summary: Get recent application logs
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: level
   *         schema:
   *           type: string
   *           enum: [info, warn, error]
   *         description: Log level to filter by
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *         description: Number of logs to return
   *     responses:
   *       200:
   *         description: A list of recent logs
   */
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

  /**
   * @swagger
   * /api/admin/businesses/pending:
   *   get:
   *     summary: Get pending businesses for verification
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: A list of pending businesses
   */
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

  /**
   * @swagger
   * /api/admin/businesses/{id}/verify:
   *   post:
   *     summary: Verify or reject a business
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the business to verify
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               approved:
   *                 type: boolean
   *               reason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Business verification status updated successfully
   */
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

  /**
   * @swagger
   * /api/admin/users/stats:
   *   get:
   *     summary: Get user statistics
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User statistics
   */
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

  /**
   * @swagger
   * /api/admin/analytics:
   *   get:
   *     summary: Get platform analytics
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           default: 30d
   *         description: The time period for the analytics
   *     responses:
   *       200:
   *         description: Platform analytics data
   */
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

  /**
   * @swagger
   * /api/admin/reports:
   *   get:
   *     summary: Get content moderation reports
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: A list of content moderation reports
   */
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
