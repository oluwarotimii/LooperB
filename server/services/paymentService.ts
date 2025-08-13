import axios from "axios";
import { storage } from "../storage";
import { orderService } from "./orderService";
import { walletService } from "./walletService";
import { notificationService } from "./notificationService";

interface PaystackResponse {
  status: boolean;
  message: string;
  data?: any;
}

export class PaymentService {
  private paystackSecretKey: string;
  private paystackPublicKey: string;
  private axiosInstance;

  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || "";
    this.paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY || "";
    this.axiosInstance = axios.create({
      baseURL: "https://api.paystack.co",
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async initializePayment(
    orderId: string,
    email: string,
    amount: number,
    useWallet: boolean = false
  ): Promise<any> {
    const order = await storage.getOrder(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    let paymentAmount = amount * 100; // Convert to kobo
    let walletDeduction = 0;

    // Check wallet balance if user wants to use wallet
    if (useWallet && order.userId) {
      const walletBalance = await walletService.getBalance(order.userId);
      walletDeduction = Math.min(walletBalance * 100, paymentAmount); // Convert to kobo
      paymentAmount -= walletDeduction;
    }

    // If wallet covers full amount, process immediately
    if (paymentAmount === 0 && walletDeduction > 0) {
      await walletService.addTransaction(
        order.userId!,
        -(walletDeduction / 100),
        "debit",
        "purchase",
        `Payment for order ${orderId}`,
        orderId
      );

      await orderService.processPayment(orderId, `wallet_${Date.now()}`);

      return {
        paymentMethod: "wallet",
        amount: walletDeduction / 100,
        success: true,
      };
    }

    // Initialize Paystack payment for remaining amount
    try {
      const response = await this.axiosInstance.post("/transaction/initialize", {
        email,
        amount: paymentAmount,
        reference: `looper_${orderId}_${Date.now()}`,
        callback_url: `${process.env.FRONTEND_URL}/orders/${orderId}/payment-success`,
        metadata: {
          orderId,
          walletDeduction: walletDeduction / 100,
          custom_fields: [
            {
              display_name: "Order ID",
              variable_name: "order_id",
              value: orderId,
            }
          ]
        }
      });

      if (response.data.status) {
        return {
          paymentMethod: "paystack",
          authorizationUrl: response.data.data.authorization_url,
          reference: response.data.data.reference,
          walletDeduction: walletDeduction / 100,
        };
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Paystack initialization error:", error);
      throw new Error("Failed to initialize payment");
    }
  }

  async verifyPayment(reference: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/transaction/verify/${reference}`);

      if (response.data.status && response.data.data.status === 'success') {
        const { metadata } = response.data.data;
        const orderId = metadata.orderId;

        // Process wallet deduction if any
        if (metadata.walletDeduction > 0) {
          const order = await storage.getOrder(orderId);
          if (order?.userId) {
            await walletService.addTransaction(
              order.userId,
              -metadata.walletDeduction,
              "debit",
              "purchase",
              `Wallet payment for order ${orderId}`,
              orderId
            );
          }
        }

        // Update order status
        await orderService.processPayment(orderId, reference);

        return {
          success: true,
          orderId,
          amount: response.data.data.amount / 100,
          reference,
        };
      } else {
        return {
          success: false,
          message: response.data.message || "Payment verification failed",
        };
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      return {
        success: false,
        message: "Failed to verify payment",
      };
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    const event = payload.event;
    const data = payload.data;

    switch (event) {
      case 'charge.success':
        await this.handleSuccessfulPayment(data);
        break;
      
      case 'charge.failed':
        await this.handleFailedPayment(data);
        break;
      
      case 'transfer.success':
        await this.handleSuccessfulPayout(data);
        break;
      
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
  }

  private async handleSuccessfulPayment(data: any): Promise<void> {
    const { reference, metadata } = data;
    const orderId = metadata?.orderId;

    if (orderId) {
      await orderService.processPayment(orderId, reference);
    }
  }

  private async handleFailedPayment(data: any): Promise<void> {
    const { reference, metadata } = data;
    const orderId = metadata?.orderId;

    if (orderId) {
      const order = await storage.getOrder(orderId);
      if (order?.userId) {
        await notificationService.createNotification({
          userId: order.userId,
          title: "Payment Failed",
          message: "Your payment failed. Please try again or contact support.",
          type: "payment",
          priority: "high",
          relatedEntityId: orderId,
          relatedEntityType: "order",
        });
      }
    }
  }

  private async handleSuccessfulPayout(data: any): Promise<void> {
    // Handle successful business payouts
    console.log("Payout successful:", data);
  }

  async createSubaccount(
    businessId: string,
    businessName: string,
    settlementBank: string,
    accountNumber: string,
    percentageCharge: number = 3.5
  ): Promise<string> {
    try {
      const response = await this.axiosInstance.post("/subaccount", {
        business_name: businessName,
        settlement_bank: settlementBank,
        account_number: accountNumber,
        percentage_charge: percentageCharge,
        description: `Looper subaccount for ${businessName}`,
      });

      if (response.data.status) {
        const subaccountCode = response.data.data.subaccount_code;
        
        // Update business with subaccount code
        await storage.updateBusiness(businessId, {
          paystackSubaccountCode: subaccountCode,
        });

        return subaccountCode;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Subaccount creation error:", error);
      throw new Error("Failed to create subaccount");
    }
  }

  async initiatePayout(businessId: string, amount: number): Promise<any> {
    const business = await storage.getBusiness(businessId);
    if (!business?.paystackSubaccountCode) {
      throw new Error("Business subaccount not found");
    }

    try {
      const response = await this.axiosInstance.post("/transfer", {
        source: "balance",
        amount: amount * 100, // Convert to kobo
        recipient: business.paystackSubaccountCode,
        reason: `Looper payout for ${business.businessName}`,
      });

      if (response.data.status) {
        return {
          success: true,
          transferCode: response.data.data.transfer_code,
          amount,
        };
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Payout error:", error);
      throw new Error("Failed to initiate payout");
    }
  }
}
