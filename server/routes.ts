import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupSwagger } from "./swagger";
import { userService } from "./services/userService";
import { businessService } from "./services/businessService";
import { listingService } from "./services/listingService";
import { orderService } from "./services/orderService";
import { PaymentService } from "./services/paymentService";

const paymentService = new PaymentService();
import { walletService } from "./services/walletService";
import { notificationService } from "./services/notificationService";
import { messageService } from "./services/messageService";
import { reviewService } from "./services/reviewService";
import { impactService } from "./services/impactService";
import { validateRequest, validateQuery } from "./middleware/validation";
import { requireBusinessAccess, requireRole, authenticateJWT } from "./middleware/auth";
import { z } from "zod";
import authRoutes from "./routes/auth";
import businessRoutes from "./routes/businesses";
import listingRoutes from "./routes/listings";
import orderRoutes from "./routes/orders";
import paymentRoutes from "./routes/payments";
import reviewRoutes from "./routes/reviews";
import { registerAdminRoutes } from "./routes/admin";
import { AuthService } from "./services/authService";
import { referralService } from "./services/referralService";

import { upload, uploadToCloudinary, cloudinary } from "./utils/fileUpload";
import path from 'path';

const authService = new AuthService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static swagger.json
  app.use('/swagger.json', express.static(path.resolve(process.cwd(), 'dist/swagger.json')));

  // Setup Swagger documentation
  setupSwagger(app);

  // Authentication routes
  app.use('/api/auth', authRoutes);
  
  // Business routes
  app.use('/api/businesses', businessRoutes);
  
  // Listing routes
  app.use('/api/listings', listingRoutes);
  
  // Order routes
  app.use('/api/orders', orderRoutes);
  
  // Payment routes
  app.use('/api/payment', paymentRoutes);
  app.use('/api/wallet', paymentRoutes);
  
  // Review routes
  app.use('/api/reviews', reviewRoutes);
  
  // Admin routes
  const adminRoutes = express.Router();
  registerAdminRoutes(adminRoutes);
  app.use('/api/admin', adminRoutes);

  app.post('/api/auth/google', validateRequest(z.object({
    idToken: z.string(),
  })), async (req, res) => {
    try {
      const { user, token } = await authService.googleLogin(req.body.idToken);
      res.json({ user, token });
    } catch (error) {
      res.status(400).json({ message: "Google authentication failed" });
    }
  });

  // File upload route with Cloudinary integration
  app.post('/api/upload', authenticateJWT, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: req.body.folder || 'looper',
        public_id: req.body.public_id
      });

      res.json({ 
        url: (result as any).secure_url,
        publicId: (result as any).public_id,
        optimizedUrl: cloudinary.url((result as any).public_id, {
          width: 500,
          height: 500,
          crop: 'auto',
          gravity: 'auto',
          fetch_format: 'auto',
          quality: 'auto:good'
        })
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'File upload failed' });
    }
  });

  // User routes
  app.get('/api/users/profile', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await userService.getUserProfile(userId);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.put('/api/users/profile', authenticateJWT, validateRequest(z.object({
    fullName: z.string().optional(),
    phone: z.string().optional(),
    role: z.enum(["consumer", "business_owner"]).optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await userService.updateUserProfile(userId, req.body);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/users/impact', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const impact = await impactService.getUserImpact(userId);
      res.json(impact);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch impact data" });
    }
  });

  app.get('/api/users/favorites', authenticateJWT, validateQuery(z.object({
    type: z.enum(["business", "listing"]).optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const favorites = await userService.getUserFavorites(userId, req.query.type);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/users/favorites', authenticateJWT, validateRequest(z.object({
    entityId: z.string(),
    type: z.enum(["business", "listing"]),
  })), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const favorite = await userService.addFavorite(userId, req.body.entityId, req.body.type);
      res.json(favorite);
    } catch (error) {
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete('/api/users/favorites/:entityId', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { entityId } = req.params;
      const { type } = req.query;
      await userService.removeFavorite(userId, entityId, type);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  app.post('/api/users/refer', authenticateJWT, validateRequest(z.object({
    referredEmail: z.string().email(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const referral = await referralService.createReferral(userId, req.body.referredEmail);
      res.json(referral);
    } catch (error) {
      res.status(500).json({ message: "Failed to create referral" });
    }
  });

  app.get('/api/users/referrals', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const referrals = await referralService.getReferralsByUser(userId);
      res.json(referrals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  app.get('/api/users/points-history', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const pointsHistory = await referralService.getPointsHistory(userId);
      res.json(pointsHistory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch points history" });
    }
  });

  // Staff invitation routes (kept here as they're not in separate file)

  app.post('/api/businesses/:id/staff', authenticateJWT, requireBusinessAccess, validateRequest(z.object({
    email: z.string().email(),
    role: z.enum(["manager", "staff"]),
  })), async (req: any, res) => {
    try {
      const result = await businessService.inviteStaff(req.params.id, req.body.email, req.body.role);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to invite staff" });
    }
  });

  app.post('/api/staff-invitations/accept', authenticateJWT, validateRequest(z.object({
    token: z.string(),
  })), async (req: any, res) => {
    try {
      await businessService.acceptStaffInvitation(req.body.token, req.user.id);
      res.json({ message: "Invitation accepted successfully." });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Payment webhook (kept here as it needs special handling)
  app.post('/api/payments/webhook', async (req, res) => {
    try {
      await paymentService.handleWebhook(req.body);
      res.status(200).send('OK');
    } catch (error) {
      res.status(400).send('Webhook failed');
    }
  });

  // Message routes
  app.get('/api/messages', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const messages = await messageService.getUserMessages(userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get('/api/listings/search', validateQuery(z.object({
    q: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    radius: z.string().optional(),
    businessType: z.string().optional(),
    maxPrice: z.string().optional(),
    dietaryTags: z.string().optional(),
    sortBy: z.enum(["expiry", "price", "rating", "distance"]).optional(),
  })), async (req, res) => {
    try {
      const listings = await listingService.searchListings(req.query);
      res.json(listings);
    } catch (error) {
      res.status(500).json({ message: "Failed to search listings" });
    }
  });

  app.get('/api/listings/:id', async (req, res) => {
    try {
      const listing = await listingService.getListingDetails(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      res.json(listing);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch listing" });
    }
  });

  app.put('/api/listings/:id', authenticateJWT, requireBusinessAccess, upload.array('media'), validateRequest(z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    originalPrice: z.string().optional(),
    discountedPrice: z.string().optional(),
    quantity: z.number().optional(),
    availableQuantity: z.number().optional(),
    pickupWindowStart: z.string().optional(),
    pickupWindowEnd: z.string().optional(),
    status: z.enum(["active", "sold_out", "expired", "cancelled"]).optional(),
  })), async (req: any, res) => {
    try {
      const media = req.files?.map((file: any) => ({ url: file.path, type: file.mimetype }));
      const listing = await listingService.updateListing(req.params.id, { ...req.body, media });
      res.json(listing);
    } catch (error) {
      res.status(500).json({ message: "Failed to update listing" });
    }
  });

  app.delete('/api/listings/:id', authenticateJWT, requireBusinessAccess, async (req: any, res) => {
    try {
      await listingService.deleteListing(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete listing" });
    }
  });

  app.get('/api/businesses/:businessId/listings', async (req, res) => {
    try {
      const listings = await listingService.getBusinessListings(req.params.businessId);
      res.json(listings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch business listings" });
    }
  });

  // Order routes
  app.post('/api/orders', authenticateJWT, validateRequest(z.object({
    businessId: z.string(),
    items: z.array(z.object({
      listingId: z.string(),
      quantity: z.number(),
    })),
    specialInstructions: z.string().optional(),
    useWallet: z.boolean().optional(),
    pointsToRedeem: z.number().int().min(0).optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const order = await orderService.createOrder(userId, req.body);
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get('/api/orders/my', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orders = await orderService.getUserOrders(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/orders/:id', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const order = await orderService.getOrderDetails(req.params.id, userId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.put('/api/orders/:id/status', authenticateJWT, requireBusinessAccess, validateRequest(z.object({
    status: z.enum(["confirmed", "ready_for_pickup", "completed", "cancelled"]),
    reason: z.string().optional(),
  })), async (req: any, res) => {
    try {
      const order = await orderService.updateOrderStatus(req.params.id, req.body.status, req.body.reason);
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  app.post('/api/orders/:id/verify-pickup', authenticateJWT, requireBusinessAccess, validateRequest(z.object({
    pickupCode: z.string(),
  })), async (req: any, res) => {
    try {
      const result = await orderService.verifyPickup(req.params.id, req.body.pickupCode);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid pickup code" });
    }
  });

  app.get('/api/businesses/:businessId/orders', authenticateJWT, requireBusinessAccess, async (req: any, res) => {
    try {
      const orders = await orderService.getBusinessOrders(req.params.businessId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch business orders" });
    }
  });

  // Payment routes
  app.post('/api/payments/initialize', authenticateJWT, validateRequest(z.object({
    orderId: z.string(),
    amount: z.string(),
    useWallet: z.boolean().optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user?.email) {
        return res.status(400).json({ message: "User email required for payment" });
      }
      
      const payment = await paymentService.initializePayment(
        req.body.orderId,
        user.email,
        parseFloat(req.body.amount),
        req.body.useWallet
      );
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Failed to initialize payment" });
    }
  });

  app.post('/api/payments/verify', validateRequest(z.object({
    reference: z.string(),
  })), async (req, res) => {
    try {
      const result = await paymentService.verifyPayment(req.body.reference);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  app.post('/api/payments/webhook', async (req, res) => {
    try {
      await paymentService.handleWebhook(req.body);
      res.status(200).send('OK');
    } catch (error) {
      res.status(400).send('Webhook failed');
    }
  });

  // Wallet routes
  app.get('/api/wallet/balance', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const balance = await walletService.getBalance(userId);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wallet balance" });
    }
  });

  app.get('/api/wallet/transactions', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const transactions = await walletService.getTransactions(userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/wallet/topup', authenticateJWT, validateRequest(z.object({
    amount: z.number().positive(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user?.email) {
        return res.status(400).json({ message: "User email required for top up" });
      }

      const topup = await walletService.initializeTopup(userId, user.email, req.body.amount);
      res.json(topup);
    } catch (error) {
      res.status(500).json({ message: "Failed to initialize top up" });
    }
  });

  // Review routes
  app.post('/api/reviews', authenticateJWT, validateRequest(z.object({
    orderId: z.string(),
    ratingFood: z.number().min(1).max(5),
    ratingService: z.number().min(1).max(5),
    ratingPackaging: z.number().min(1).max(5).optional(),
    ratingValue: z.number().min(1).max(5).optional(),
    comment: z.string().optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const review = await reviewService.createReview(userId, req.body);
      res.json(review);
    } catch (error) {
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get('/api/businesses/:businessId/reviews', async (req, res) => {
    try {
      const reviews = await reviewService.getBusinessReviews(req.params.businessId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get('/api/users/reviews', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const reviews = await reviewService.getUserReviews(userId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user reviews" });
    }
  });

  // Message routes
  app.post('/api/messages', authenticateJWT, validateRequest(z.object({
    receiverId: z.string().optional(),
    businessId: z.string().optional(),
    orderId: z.string().optional(),
    subject: z.string().optional(),
    content: z.string(),
    messageType: z.enum(["support", "order_inquiry", "business_chat"]),
  })), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const message = await messageService.createMessage(userId, req.body);
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get('/api/messages', authenticateJWT, validateQuery(z.object({
    businessId: z.string().optional(),
    type: z.string().optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const messages = await messageService.getUserMessages(userId, req.query);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.put('/api/messages/:id/read', authenticateJWT, async (req: any, res) => {
    try {
      const message = await messageService.markAsRead(req.params.id);
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Notification routes
  app.get('/api/notifications', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notifications = await notificationService.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', authenticateJWT, async (req: any, res) => {
    try {
      const notification = await notificationService.markAsRead(req.params.id);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/notifications/read-all', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await notificationService.markAllAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Dietary tags route
  app.get('/api/dietary-tags', async (req, res) => {
    try {
      const tags = await storage.getDietaryTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dietary tags" });
    }
  });

  // Analytics routes
  app.get('/api/businesses/:businessId/analytics', authenticateJWT, requireBusinessAccess, validateQuery(z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })), async (req: any, res) => {
    try {
      const analytics = await impactService.getBusinessAnalytics(
        req.params.businessId,
        req.query.startDate ? new Date(req.query.startDate) : undefined,
        req.query.endDate ? new Date(req.query.endDate) : undefined
      );
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const connectedClients = new Map<string, WebSocket>();

  wss.on('connection', (ws, req) => {
    const userId = new URL(req.url!, `http://${req.headers.host}`).searchParams.get("userId");

    if (userId) {
      connectedClients.set(userId, ws);
    }

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'authenticate':
            if (message.userId) {
              connectedClients.set(message.userId, ws);
            }
            break;
          case 'typing_indicator':
            // Broadcast typing indicator to the relevant user/business
            break;
          case 'presence':
            // Broadcast presence status to relevant users/businesses
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        connectedClients.delete(userId);
      }
    });
  });

  // Function to send real-time updates to connected clients
  app.locals.broadcastToUser = (userId: string, message: any) => {
    const client = connectedClients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  };

  return httpServer;
}
