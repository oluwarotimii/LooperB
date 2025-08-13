import { storage } from "../storage";
import { listingService } from "./listingService";
import { notificationService } from "./notificationService";
import { walletService } from "./walletService";
import { PaymentService } from "./paymentService";

const paymentService = new PaymentService();
import { qrCodeGenerator } from "../utils/qrCode";
import type { Order, InsertOrder, OrderItem } from "@shared/schema";

interface CreateOrderRequest {
  businessId: string;
  items: Array<{
    listingId: string;
    quantity: number;
  }>;
  specialInstructions?: string;
  useWallet?: boolean;
  pointsToRedeem?: number;
}

export class OrderService {
  async createOrder(userId: string, orderData: CreateOrderRequest): Promise<any> {
    const { items, useWallet, pointsToRedeem, ...orderInfo } = orderData;

    // Calculate total amount and validate items
    let totalAmount = 0;
    const orderItems: Omit<OrderItem, "id" | "orderId">[] = [];

    for (const item of items) {
      const listing = await storage.getFoodListing(item.listingId);
      if (!listing) {
        throw new Error(`Listing ${item.listingId} not found`);
      }

      if (listing.availableQuantity < item.quantity) {
        throw new Error(`Insufficient quantity for ${listing.title}`);
      }

      if (listing.status !== "active") {
        throw new Error(`Listing ${listing.title} is no longer available`);
      }

      const itemTotal = parseFloat(listing.discountedPrice) * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        listingId: item.listingId,
        quantity: item.quantity,
        pricePerItem: listing.discountedPrice,
        totalPrice: itemTotal.toString(),
      });
    }

    // Apply loyalty discount
    if (pointsToRedeem && pointsToRedeem > 0) {
      const user = await storage.getUser(userId);
      if (!user || user.pointsBalance < pointsToRedeem) {
        throw new Error("Insufficient points");
      }
      const discountAmount = pointsToRedeem / 10; // Example: 10 points = ₦1 discount
      totalAmount = Math.max(0, totalAmount - discountAmount);
      await storage.addPoints(userId, -pointsToRedeem, "points_redemption");
    }

    // Reserve items
    for (const item of items) {
      const reserved = await listingService.reserveItems(item.listingId, item.quantity);
      if (!reserved) {
        // Release any previously reserved items
        throw new Error("Unable to reserve items");
      }
    }

    try {
      // Create order
      const order = await storage.createOrder({
        userId,
        businessId: orderData.businessId,
        totalAmount: totalAmount.toString(),
        specialInstructions: orderData.specialInstructions,
      });

      // Create order items
      const createdItems = await storage.createOrderItems(
        orderItems.map(item => ({ ...item, orderId: order.id }))
      );

      // Generate QR code for pickup
      const qrCodeUrl = await qrCodeGenerator.generatePickupQR(order.pickupCode);
      await storage.updateOrder(order.id, { qrCodeUrl });

      // Initialize payment
      const user = await storage.getUser(userId);
      if (!user?.email) {
        throw new Error("User email not found");
      }
      const paymentInfo = await paymentService.initializePayment(order.id, user.email, totalAmount, useWallet);

      // Send notifications
      await this.sendOrderNotifications(order, "created");

      return { order, paymentInfo };
    } catch (error) {
      // Release reserved items on error
      for (const item of items) {
        await listingService.releaseReservedItems(item.listingId, item.quantity);
      }
      throw error;
    }
  }

  async getOrderDetails(orderId: string, userId?: string): Promise<Order | null> {
    const order = await storage.getOrder(orderId);
    
    // Verify user has access to this order
    if (userId && order?.userId !== userId) {
      // Check if user is part of the business
      const userBusinesses = await storage.getUserBusinesses(userId);
      const hasAccess = userBusinesses.some(b => b.id === order?.businessId);
      if (!hasAccess) {
        return null;
      }
    }

    return order;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return await storage.getOrdersByUser(userId);
  }

  async getBusinessOrders(businessId: string): Promise<Order[]> {
    return await storage.getOrdersByBusiness(businessId);
  }

  async updateOrderStatus(
    orderId: string, 
    status: "confirmed" | "ready_for_pickup" | "completed" | "cancelled",
    reason?: string
  ): Promise<Order> {
    const updateData: Partial<Order> = { status };

    if (status === "completed") {
      updateData.completedAt = new Date();
      
      // Award points to user
      const order = await storage.getOrder(orderId);
      if (order?.userId) {
        const pointsToAward = Math.floor(parseFloat(order.totalAmount) / 100); // 1 point per ₦100
        await storage.addPoints(order.userId, pointsToAward, "order_completion", orderId);
        
        // Update total meals rescued
        const orderItems = await storage.getOrderItems(orderId);
        const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
        const user = await storage.getUser(order.userId);
        if (user) {
          await storage.updateUser(order.userId, {
            totalMealsRescued: (user.totalMealsRescued || 0) + totalItems
          });
        }
      }
    }

    if (status === "cancelled") {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = reason;
      
      // Release reserved items
      const orderItems = await storage.getOrderItems(orderId);
      for (const item of orderItems) {
        if (item.listingId) {
          await listingService.releaseReservedItems(item.listingId, item.quantity);
        }
      }
    }

    const order = await storage.updateOrder(orderId, updateData);
    
    // Send notifications
    await this.sendOrderNotifications(order, status);

    return order;
  }

  async verifyPickup(orderId: string, pickupCode: string): Promise<{ success: boolean; message: string }> {
    const order = await storage.getOrderByPickupCode(pickupCode);
    
    if (!order || order.id !== orderId) {
      return { success: false, message: "Invalid pickup code" };
    }

    if (order.status !== "ready_for_pickup") {
      return { success: false, message: "Order is not ready for pickup" };
    }

    // Mark order as completed
    await this.updateOrderStatus(orderId, "completed");

    return { success: true, message: "Order pickup verified successfully" };
  }

  async processPayment(orderId: string, paymentReference: string): Promise<Order> {
    const order = await storage.updateOrder(orderId, {
      status: "paid",
      paymentReference,
    });

    // Send confirmation notifications
    await this.sendOrderNotifications(order, "paid");

    return order;
  }

  async refundOrder(orderId: string, reason: string): Promise<void> {
    const order = await storage.getOrder(orderId);
    if (!order) throw new Error("Order not found");

    // Process refund
    if (order.paymentReference?.startsWith("wallet_")) {
      // Process wallet refund
      if (order.userId) {
        await walletService.addTransaction(
          order.userId,
          parseFloat(order.totalAmount),
          "credit",
          "order_refund",
          `Refund for order ${orderId}: ${reason}`,
          orderId
        );
      }
    } else if (order.paymentReference) {
      // Process Paystack refund
      // This is a simplified example. In a real application, you would need to
      // call the Paystack API to process the refund.
      console.log(`Initiating Paystack refund for order ${orderId}`);
    }

    // Cancel order
    await this.updateOrderStatus(orderId, "cancelled", reason);

    // Send refund notification
    if (order.userId) {
      await notificationService.createNotification({
        userId: order.userId,
        title: "Order Refunded",
        message: `Your order has been refunded ₦${order.totalAmount}. Reason: ${reason}`,
        type: "payment",
        relatedEntityId: orderId,
        relatedEntityType: "order",
      });
    }
  }

  private async sendOrderNotifications(order: Order, event: string): Promise<void> {
    const business = await storage.getBusiness(order.businessId);
    const businessUsers = await storage.getBusinessUsers(order.businessId);

    // Notify customer
    if (order.userId) {
      let customerMessage = "";
      switch (event) {
        case "created":
          customerMessage = `Your order from ${business?.businessName} has been created. Pickup code: ${order.pickupCode}`;
          break;
        case "confirmed":
          customerMessage = `Your order from ${business?.businessName} has been confirmed and is being prepared.`;
          break;
        case "ready_for_pickup":
          customerMessage = `Your order from ${business?.businessName} is ready for pickup! Use code: ${order.pickupCode}`;
          break;
        case "completed":
          customerMessage = `Thank you for your order from ${business?.businessName}! You've helped reduce food waste.`;
          break;
        case "cancelled":
          customerMessage = `Your order from ${business?.businessName} has been cancelled.`;
          break;
      }

      if (customerMessage) {
        await notificationService.createNotification({
          userId: order.userId,
          title: `Order ${event.replace('_', ' ')}`,
          message: customerMessage,
          type: "order_update",
          relatedEntityId: order.id,
          relatedEntityType: "order",
        });
      }
    }

    // Notify business users
    if (event === "created" && businessUsers.length > 0) {
      for (const businessUser of businessUsers) {
        await notificationService.createNotification({
          userId: businessUser.userId,
          title: "New Order Received",
          message: `New order #${order.pickupCode} received for ₦${order.totalAmount}`,
          type: "order_update",
          relatedEntityId: order.id,
          relatedEntityType: "order",
        });
      }
    }
  }

  async getOrderStatistics(businessId?: string, userId?: string): Promise<any> {
    // This would require custom queries to aggregate order statistics
    // For now, return a placeholder structure
    return {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
    };
  }
}

export const orderService = new OrderService();
