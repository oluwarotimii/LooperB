import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { userService } from "./services/userService";
import { businessService } from "./services/businessService";
import { listingService } from "./services/listingService";
import { orderService } from "./services/orderService";
import { paymentService } from "./services/paymentService";
import { walletService } from "./services/walletService";
import { notificationService } from "./services/notificationService";
import { messageService } from "./services/messageService";
import { reviewService } from "./services/reviewService";
import { impactService } from "./services/impactService";
import { validateRequest, validateQuery } from "./middleware/validation";
import { requireBusinessAccess, requireRole } from "./middleware/auth";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User routes
  app.get('/api/users/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await userService.getUserProfile(userId);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.put('/api/users/profile', isAuthenticated, validateRequest(z.object({
    fullName: z.string().optional(),
    phone: z.string().optional(),
    userType: z.enum(["consumer", "business_owner"]).optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await userService.updateUserProfile(userId, req.body);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/users/impact', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const impact = await impactService.getUserImpact(userId);
      res.json(impact);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch impact data" });
    }
  });

  app.get('/api/users/favorites', isAuthenticated, validateQuery(z.object({
    type: z.enum(["business", "listing"]).optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await userService.getUserFavorites(userId, req.query.type);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/users/favorites', isAuthenticated, validateRequest(z.object({
    entityId: z.string(),
    type: z.enum(["business", "listing"]),
  })), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorite = await userService.addFavorite(userId, req.body.entityId, req.body.type);
      res.json(favorite);
    } catch (error) {
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete('/api/users/favorites/:entityId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entityId } = req.params;
      const { type } = req.query;
      await userService.removeFavorite(userId, entityId, type);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Business routes
  app.post('/api/businesses', isAuthenticated, validateRequest(z.object({
    businessName: z.string(),
    description: z.string().optional(),
    address: z.string(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    businessType: z.enum(["restaurant", "hotel", "bakery", "supermarket", "cafe", "caterer"]),
    openingHours: z.record(z.any()).optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await businessService.createBusiness(userId, req.body);
      res.json(business);
    } catch (error) {
      res.status(500).json({ message: "Failed to create business" });
    }
  });

  app.get('/api/businesses/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.put('/api/businesses/:id', isAuthenticated, requireBusinessAccess, validateRequest(z.object({
    businessName: z.string().optional(),
    description: z.string().optional(),
    address: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    openingHours: z.record(z.any()).optional(),
  })), async (req: any, res) => {
    try {
      const business = await businessService.updateBusiness(req.params.id, req.body);
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

  app.post('/api/businesses/:id/staff', isAuthenticated, requireBusinessAccess, validateRequest(z.object({
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

  // Food listing routes
  app.post('/api/listings', isAuthenticated, requireBusinessAccess, validateRequest(z.object({
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
      const listing = await listingService.createListing(req.body);
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

  app.put('/api/listings/:id', isAuthenticated, requireBusinessAccess, validateRequest(z.object({
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
      const listing = await listingService.updateListing(req.params.id, req.body);
      res.json(listing);
    } catch (error) {
      res.status(500).json({ message: "Failed to update listing" });
    }
  });

  app.delete('/api/listings/:id', isAuthenticated, requireBusinessAccess, async (req: any, res) => {
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
  app.post('/api/orders', isAuthenticated, validateRequest(z.object({
    businessId: z.string(),
    items: z.array(z.object({
      listingId: z.string(),
      quantity: z.number(),
    })),
    specialInstructions: z.string().optional(),
    useWallet: z.boolean().optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const order = await orderService.createOrder(userId, req.body);
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get('/api/orders/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await orderService.getUserOrders(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const order = await orderService.getOrderDetails(req.params.id, userId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.put('/api/orders/:id/status', isAuthenticated, requireBusinessAccess, validateRequest(z.object({
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

  app.post('/api/orders/:id/verify-pickup', isAuthenticated, requireBusinessAccess, validateRequest(z.object({
    pickupCode: z.string(),
  })), async (req: any, res) => {
    try {
      const result = await orderService.verifyPickup(req.params.id, req.body.pickupCode);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid pickup code" });
    }
  });

  app.get('/api/businesses/:businessId/orders', isAuthenticated, requireBusinessAccess, async (req: any, res) => {
    try {
      const orders = await orderService.getBusinessOrders(req.params.businessId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch business orders" });
    }
  });

  // Payment routes
  app.post('/api/payments/initialize', isAuthenticated, validateRequest(z.object({
    orderId: z.string(),
    amount: z.string(),
    useWallet: z.boolean().optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/wallet/balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const balance = await walletService.getBalance(userId);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wallet balance" });
    }
  });

  app.get('/api/wallet/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await walletService.getTransactions(userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/wallet/topup', isAuthenticated, validateRequest(z.object({
    amount: z.number().positive(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/reviews', isAuthenticated, validateRequest(z.object({
    orderId: z.string(),
    ratingFood: z.number().min(1).max(5),
    ratingService: z.number().min(1).max(5),
    ratingPackaging: z.number().min(1).max(5).optional(),
    ratingValue: z.number().min(1).max(5).optional(),
    comment: z.string().optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/users/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reviews = await reviewService.getUserReviews(userId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user reviews" });
    }
  });

  // Message routes
  app.post('/api/messages', isAuthenticated, validateRequest(z.object({
    receiverId: z.string().optional(),
    businessId: z.string().optional(),
    orderId: z.string().optional(),
    subject: z.string().optional(),
    content: z.string(),
    messageType: z.enum(["support", "order_inquiry", "business_chat"]),
  })), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const message = await messageService.createMessage(userId, req.body);
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get('/api/messages', isAuthenticated, validateQuery(z.object({
    businessId: z.string().optional(),
    type: z.string().optional(),
  })), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await messageService.getUserMessages(userId, req.query);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.put('/api/messages/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const message = await messageService.markAsRead(req.params.id);
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await notificationService.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notification = await notificationService.markAsRead(req.params.id);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/businesses/:businessId/analytics', isAuthenticated, requireBusinessAccess, validateQuery(z.object({
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
    console.log('WebSocket connection established');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'authenticate':
            // Store authenticated user connection
            if (message.userId) {
              connectedClients.set(message.userId, ws);
            }
            break;
            
          case 'order_status_request':
            // Send real-time order updates
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
      // Remove client from connected clients
      for (const [userId, client] of connectedClients.entries()) {
        if (client === ws) {
          connectedClients.delete(userId);
          break;
        }
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
