import { storage } from "../storage";
import { notificationService } from "./notificationService";
import type { Message, InsertMessage } from "@shared/schema";

export class MessageService {
  async createMessage(senderId: string, messageData: InsertMessage): Promise<Message> {
    const message = await storage.createMessage({
      ...messageData,
      senderId,
    });

    // Notify recipient if specified
    if (messageData.receiverId) {
      await notificationService.createNotification({
        userId: messageData.receiverId,
        title: "New Message",
        message: `You have a new message${messageData.subject ? `: ${messageData.subject}` : ''}`,
        type: "system",
        relatedEntityId: message.id,
        relatedEntityType: "message",
      });
    }

    // Notify business users for business messages
    if (messageData.businessId && messageData.messageType === "business_chat") {
      await this.notifyBusinessUsers(messageData.businessId, message);
    }

    // Send real-time message via WebSocket
    this.sendRealTimeMessage(messageData.receiverId || messageData.businessId || '', message);

    return message;
  }

  async getUserMessages(userId: string, filters: { businessId?: string; type?: string }): Promise<Message[]> {
    return await storage.getMessages(userId, filters.businessId);
  }

  async getConversation(userId: string, otherUserId: string): Promise<Message[]> {
    // This would require a custom query to get messages between two users
    const userMessages = await storage.getMessages(userId);
    
    return userMessages.filter(message => 
      message.receiverId === otherUserId || message.senderId === otherUserId
    ).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async getBusinessConversation(userId: string, businessId: string): Promise<Message[]> {
    const messages = await storage.getMessages(userId, businessId);
    
    return messages.sort((a, b) => 
      new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
    );
  }

  async markAsRead(messageId: string): Promise<Message> {
    return await storage.markMessageAsRead(messageId);
  }

  async markConversationAsRead(userId: string, otherUserId: string): Promise<void> {
    const conversation = await this.getConversation(userId, otherUserId);
    
    for (const message of conversation) {
      if (!message.isRead && message.receiverId === userId) {
        await this.markAsRead(message.id);
      }
    }
  }

  async createSupportTicket(
    userId: string,
    subject: string,
    content: string,
    orderId?: string,
    priority: "low" | "normal" | "high" | "urgent" = "normal"
  ): Promise<Message> {
    const message = await this.createMessage(userId, {
      subject,
      content,
      orderId,
      messageType: "support",
    });

    // Notify support team
    await notificationService.createNotification({
      userId: "support", // This would be a support team user or system
      title: "New Support Ticket",
      message: `New ${priority} priority support ticket: ${subject}`,
      type: "system",
      priority,
      relatedEntityId: message.id,
      relatedEntityType: "message",
    });

    return message;
  }

  async respondToSupportTicket(
    supportUserId: string,
    originalMessageId: string,
    response: string
  ): Promise<Message> {
    const originalMessage = await this.getMessageById(originalMessageId);
    if (!originalMessage) {
      throw new Error("Original message not found");
    }

    const responseMessage = await this.createMessage(supportUserId, {
      receiverId: originalMessage.senderId,
      subject: `Re: ${originalMessage.subject}`,
      content: response,
      messageType: "support",
    });

    return responseMessage;
  }

  async createOrderInquiry(
    userId: string,
    businessId: string,
    orderId: string,
    inquiry: string
  ): Promise<Message> {
    const order = await storage.getOrder(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    return await this.createMessage(userId, {
      businessId,
      orderId,
      subject: `Inquiry about Order #${order.pickupCode}`,
      content: inquiry,
      messageType: "order_inquiry",
    });
  }

  async broadcastToBusinessUsers(
    businessId: string,
    senderId: string,
    subject: string,
    content: string
  ): Promise<void> {
    const businessUsers = await storage.getBusinessUsers(businessId);
    
    for (const businessUser of businessUsers) {
      if (businessUser.userId !== senderId) {
        await this.createMessage(senderId, {
          receiverId: businessUser.userId,
          businessId,
          subject,
          content,
          messageType: "business_chat",
        });
      }
    }
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const messages = await storage.getMessages(userId);
    return messages.filter(m => !m.isRead && m.receiverId === userId).length;
  }

  async searchMessages(
    userId: string,
    query: string,
    filters?: {
      messageType?: string;
      businessId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Message[]> {
    const messages = await storage.getMessages(userId, filters?.businessId);
    
    return messages.filter(message => {
      const matchesQuery = message.content.toLowerCase().includes(query.toLowerCase()) ||
                          (message.subject && message.subject.toLowerCase().includes(query.toLowerCase()));
      
      let matchesFilters = true;
      
      if (filters?.messageType && message.messageType !== filters.messageType) {
        matchesFilters = false;
      }
      
      if (filters?.startDate && new Date(message.createdAt!) < filters.startDate) {
        matchesFilters = false;
      }
      
      if (filters?.endDate && new Date(message.createdAt!) > filters.endDate) {
        matchesFilters = false;
      }
      
      return matchesQuery && matchesFilters;
    });
  }

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const message = await this.getMessageById(messageId);
    
    if (!message || (message.senderId !== userId && message.receiverId !== userId)) {
      return false;
    }

    // In a real implementation, you might want to soft delete or only hide from user
    // For now, we'll return true to indicate successful deletion
    return true;
  }

  async getMessageStatistics(businessId?: string): Promise<any> {
    // This would require custom queries for analytics
    return {
      totalMessages: 0,
      messagesByType: {},
      averageResponseTime: 0,
      unreadMessages: 0,
    };
  }

  async createAutoResponse(
    businessId: string,
    messageType: string,
    template: string
  ): Promise<void> {
    // This would store auto-response templates for businesses
    console.log(`Creating auto-response for business ${businessId}: ${template}`);
  }

  async sendScheduledMessage(
    senderId: string,
    messageData: InsertMessage,
    scheduleTime: Date
  ): Promise<void> {
    const delay = scheduleTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(async () => {
        await this.createMessage(senderId, messageData);
      }, delay);
    } else {
      await this.createMessage(senderId, messageData);
    }
  }

  private async getMessageById(messageId: string): Promise<Message | null> {
    return await storage.getMessage(messageId);
  }

  private async notifyBusinessUsers(businessId: string, message: Message): Promise<void> {
    const businessUsers = await storage.getBusinessUsers(businessId);
    
    for (const businessUser of businessUsers) {
      if (businessUser.userId !== message.senderId) {
        await notificationService.createNotification({
          userId: businessUser.userId,
          title: "New Business Message",
          message: `New message: ${message.subject || 'No subject'}`,
          type: "system",
          relatedEntityId: message.id,
          relatedEntityType: "message",
        });
      }
    }
  }

  private sendRealTimeMessage(recipientId: string, message: Message): void {
    // Integration with WebSocket server
    if (global.app?.locals?.broadcastToUser) {
      global.app.locals.broadcastToUser(recipientId, {
        type: 'message',
        data: message,
      });
    }
  }
}

export const messageService = new MessageService();
