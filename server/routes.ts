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
import { requireBusinessAccess, requireRole, verifyToken } from "./middleware/auth";
import { z } from "zod";
import { authService } from "./services/authService";
import { passwordResetService } from "./services/passwordResetService";
import { referralService } from "./services/referralService";

import { upload } from "./utils/fileUpload";
import path from 'path';

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static swagger.json
  app.use('/swagger.json', express.static(path.resolve(process.cwd(), 'dist/swagger.json')));

  // Setup Swagger documentation
  setupSwagger(app);

  // Auth routes
  app.post('/api/auth/register', validateRequest(z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string(),
  })), async (req, res) => {
    try {
      const user = await authService.register(req.body);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post('/api/auth/login', validateRequest(z.object({
    email: z.string().email(),
    password: z.string(),
  })), async (req, res) => {
    try {
      const { user, token } = await authService.login(req.body.email, req.body.password);
      res.json({ user, token });
    } catch (error) {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  app.post('/api/auth/forgot-password', validateRequest(z.object({
    email: z.string().email(),
  })), async (req, res) => {
    try {
      await passwordResetService.requestPasswordReset(req.body.email);
      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      res.status(500).json({ message: "Failed to request password reset" });
    }
  });

  app.post('/api/auth/reset-password', validateRequest(z.object({
    token: z.string().uuid(),
    newPassword: z.string().min(8),
  })), async (req, res) => {
    try {
      await passwordResetService.resetPassword(req.body.token, req.body.newPassword);
      res.json({ message: "Password has been reset successfully." });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post('/api/auth/google', validateRequest(z.object({
    idToken: z.string(),
  })), async (req, res) => {
    try {
      const { user, token, refreshToken } = await authService.googleLogin(req.body.idToken);
      res.json({ user, token, refreshToken });
    } catch (error) {
      res.status(400).json({ message: "Google authentication failed" });
    }
  });

  app.post('/api/auth/refresh-token', validateRequest(z.object({
    refreshToken: z.string(),
  })), async (req, res) => {
    try {
      const { accessToken } = await authService.refreshAccessToken(req.body.refreshToken);
      res.json({ accessToken });
    } catch (error) {
      res.status(401).json({ message: error.message });
    }
  });

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

  // File upload route
  app.post('/api/upload', verifyToken, upload.single('file'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    res.json({ url: req.file.path });
  });

  // User routes
  app.get('/api/users/profile', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await userService.getUserProfile(userId);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.put('/api/users/profile', verifyToken, validateRequest(z.object({
    fullName: z.string().optional(),
    phone: z.string().optional(),
    userType: z.enum(["consumer", "business_owner"]).optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await userService.updateUserProfile(userId, req.body);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/users/impact', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const impact = await impactService.getUserImpact(userId);
      res.json(impact);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch impact data" });
    }
  });

  app.get('/api/users/favorites', verifyToken, validateQuery(z.object({
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

  app.post('/api/users/favorites', verifyToken, validateRequest(z.object({
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

  app.delete('/api/users/favorites/:entityId', verifyToken, async (req: any, res) => {
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

  app.post('/api/users/refer', verifyToken, validateRequest(z.object({
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

  app.get('/api/users/referrals', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const referrals = await referralService.getReferralsByUser(userId);
      res.json(referrals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  app.get('/api/users/points-history', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const pointsHistory = await referralService.getPointsHistory(userId);
      res.json(pointsHistory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch points history" });
    }
  });

  // Business routes
  app.post('/api/businesses', verifyToken, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]), validateRequest(z.object({
    businessName: z.string(),
    description: z.string().optional(),
    address: z.string(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    businessType: z.enum(["restaurant", "hotel", "bakery", "supermarket", "cafe", "caterer"]),
    openingHours: z.record(z.any()).optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const logoUrl = req.files?.logo?.[0]?.path;
      const coverImageUrl = req.files?.coverImage?.[0]?.path;
      const business = await businessService.createBusiness(userId, { ...req.body, logoUrl, coverImageUrl });
      res.json(business);
    } catch (error) {
      res.status(500).json({ message: "Failed to create business" });
    }
  });

  app.get('/api/businesses/my', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businesses = await businessService.getUserBusinesses(userId);
      res.json(businesses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch businesses" });
    }
  });

  app.get('/api/businesses/:id', async (req, res) => {
    try {
      const business = await businessService.getBusinessDetails(req.params.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      res.json(business);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch business" });
    }
  });

  app.put('/api/businesses/:id', verifyToken, requireBusinessAccess, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]), validateRequest(z.object({
    businessName: z.string().optional(),
    description: z.string().optional(),
    address: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    openingHours: z.record(z.any()).optional(),
  })), async (req: any, res) => {
    try {
      const logoUrl = req.files?.logo?.[0]?.path;
      const coverImageUrl = req.files?.coverImage?.[0]?.path;
      const business = await businessService.updateBusiness(req.params.id, { ...req.body, logoUrl, coverImageUrl });
      res.json(business);
    } catch (error) {
      res.status(500).json({ message: "Failed to update business" });
    }
  });

  app.get('/api/businesses/search', validateQuery(z.object({
    q: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    radius: z.string().optional(),
    businessType: z.string().optional(),
  })), async (req, res) => {
    try {
      const businesses = await businessService.searchBusinesses(req.query);
      res.json(businesses);
    } catch (error) {
      res.status(500).json({ message: "Failed to search businesses" });
    }
  });

  app.post('/api/businesses/:id/staff', verifyToken, requireBusinessAccess, validateRequest(z.object({
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

  app.post('/api/staff-invitations/accept', verifyToken, validateRequest(z.object({
    token: z.string(),
  })), async (req: any, res) => {
    try {
      await businessService.acceptStaffInvitation(req.body.token, req.user.id);
      res.json({ message: "Invitation accepted successfully." });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Food listing routes
  app.post('/api/listings', verifyToken, requireBusinessAccess, upload.array('media'), validateRequest(z.object({
    businessId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    listingType: z.enum(["individual", "whoop_bag", "chef_special", "mystery_box"]),
    originalPrice: z.string(),
    discountedPrice: z.string(),
    quantity: z.number(),
    pickupWindowStart: z.string(),
    pickupWindowEnd: z.string(),
    allergenInfo: z.string().optional(),
    ingredients: z.string().optional(),
    dietaryTagIds: z.array(z.string()).optional(),
  })), async (req: any, res) => {
    try {
      const media = req.files?.map((file: any) => ({ url: file.path, type: file.mimetype }));
      const listing = await listingService.createListing({ ...req.body, media });
      res.json(listing);
    } catch (error) {
      res.status(500).json({ message: "Failed to create listing" });
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

  app.put('/api/listings/:id', verifyToken, requireBusinessAccess, upload.array('media'), validateRequest(z.object({
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

  app.delete('/api/listings/:id', verifyToken, requireBusinessAccess, async (req: any, res) => {
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
  app.post('/api/orders', verifyToken, validateRequest(z.object({
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

  app.get('/api/orders/my', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orders = await orderService.getUserOrders(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/orders/:id', verifyToken, async (req: any, res) => {
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

  app.put('/api/orders/:id/status', verifyToken, requireBusinessAccess, validateRequest(z.object({
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

  app.post('/api/orders/:id/verify-pickup', verifyToken, requireBusinessAccess, validateRequest(z.object({
    pickupCode: z.string(),
  })), async (req: any, res) => {
    try {
      const result = await orderService.verifyPickup(req.params.id, req.body.pickupCode);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid pickup code" });
    }
  });

  app.get('/api/businesses/:businessId/orders', verifyToken, requireBusinessAccess, async (req: any, res) => {
    try {
      const orders = await orderService.getBusinessOrders(req.params.businessId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch business orders" });
    }
  });

  // Payment routes
  app.post('/api/payments/initialize', verifyToken, validateRequest(z.object({
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
  app.get('/api/wallet/balance', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const balance = await walletService.getBalance(userId);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wallet balance" });
    }
  });

  app.get('/api/wallet/transactions', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const transactions = await walletService.getTransactions(userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/wallet/topup', verifyToken, validateRequest(z.object({
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
  app.post('/api/reviews', verifyToken, validateRequest(z.object({
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

  app.get('/api/users/reviews', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const reviews = await reviewService.getUserReviews(userId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user reviews" });
    }
  });

  // Message routes
  app.post('/api/messages', verifyToken, validateRequest(z.object({
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

  app.get('/api/messages', verifyToken, validateQuery(z.object({
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

  app.put('/api/messages/:id/read', verifyToken, async (req: any, res) => {
    try {
      const message = await messageService.markAsRead(req.params.id);
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Notification routes
  app.get('/api/notifications', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notifications = await notificationService.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', verifyToken, async (req: any, res) => {
    try {
      const notification = await notificationService.markAsRead(req.params.id);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/notifications/read-all', verifyToken, async (req: any, res) => {
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
  app.get('/api/businesses/:businessId/analytics', verifyToken, requireBusinessAccess, validateQuery(z.object({
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
