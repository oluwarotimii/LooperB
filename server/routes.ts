import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupSwagger } from "./swagger";
import { z } from "zod";
import authRoutes from "./routes/auth";
import businessRoutes from "./routes/businesses";
import listingRoutes from "./routes/listings";
import orderRoutes from "./routes/orders";
import paymentRoutes from "./routes/payments";
import reviewRoutes from "./routes/reviews";
import usersRoutes from "./routes/users";
import messagesRoutes from "./routes/messages";
import notificationsRoutes from "./routes/notifications";
import generalRoutes from "./routes/general";
import { registerAdminRoutes } from "./routes/admin";
import { AuthService } from "./services/authService";
import path from 'path';
import { logger } from './utils/logger';
import { authenticateJWT } from './middleware/auth'; // Import authenticateJWT

const authService = new AuthService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static swagger.json
  app.use('/swagger.json', express.static(path.resolve(process.cwd(), 'dist/swagger.json')));

  // Setup Swagger documentation
  setupSwagger(app);

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/businesses', authenticateJWT, businessRoutes);
  app.use('/api/listings', listingRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/wallet', paymentRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api', generalRoutes);

  // Admin routes
  const adminRoutes = express.Router();
  registerAdminRoutes(adminRoutes);
  app.use('/api/admin', adminRoutes);

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