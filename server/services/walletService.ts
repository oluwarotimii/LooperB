import { storage } from "../storage";
import { paymentService } from "./paymentService";
import { notificationService } from "./notificationService";
import type { WalletTransaction } from "@shared/schema";

export class WalletService {
  async getBalance(userId: string): Promise<number> {
    return await storage.getWalletBalance(userId);
  }

  async getTransactions(userId: string): Promise<WalletTransaction[]> {
    return await storage.getWalletTransactions(userId);
  }

  async addTransaction(
    userId: string,
    amount: number,
    type: "credit" | "debit",
    source: string,
    description: string,
    orderId?: string
  ): Promise<WalletTransaction> {
    // Update user wallet balance
    const user = await storage.updateWalletBalance(userId, amount);
    
    // Create transaction record
    const transaction = await storage.createWalletTransaction({
      userId,
      amount: amount.toString(),
      type,
      source,
      description,
      orderId,
      balanceAfter: user.walletBalance,
      reference: this.generateTransactionReference(),
    });

    // Send notification for significant transactions
    if (Math.abs(amount) >= 1000) { // ₦1,000 or more
      await notificationService.createNotification({
        userId,
        title: type === "credit" ? "Wallet Credited" : "Wallet Debited",
        message: `₦${Math.abs(amount).toLocaleString()} ${type === "credit" ? "added to" : "deducted from"} your wallet. ${description}`,
        type: "payment",
        relatedEntityId: transaction.id,
        relatedEntityType: "transaction",
      });
    }

    return transaction;
  }

  async initializeTopup(userId: string, email: string, amount: number): Promise<any> {
    if (amount < 100) {
      throw new Error("Minimum top-up amount is ₦100");
    }

    if (amount > 100000) {
      throw new Error("Maximum top-up amount is ₦100,000");
    }

    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amount * 100, // Convert to kobo
          reference: `wallet_topup_${userId}_${Date.now()}`,
          callback_url: `${process.env.FRONTEND_URL}/wallet/topup-success`,
          metadata: {
            userId,
            type: 'wallet_topup',
            custom_fields: [
              {
                display_name: "Transaction Type",
                variable_name: "transaction_type",
                value: "Wallet Top-up",
              }
            ]
          }
        })
      });

      const result = await response.json();

      if (result.status) {
        return {
          authorizationUrl: result.data.authorization_url,
          reference: result.data.reference,
          amount,
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Wallet top-up initialization error:", error);
      throw new Error("Failed to initialize wallet top-up");
    }
  }

  async processTopup(reference: string): Promise<any> {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      });

      const result = await response.json();

      if (result.status && result.data.status === 'success') {
        const { metadata } = result.data;
        const userId = metadata.userId;
        const amount = result.data.amount / 100; // Convert from kobo

        // Credit user wallet
        await this.addTransaction(
          userId,
          amount,
          "credit",
          "top_up",
          `Wallet top-up via Paystack`,
        );

        return {
          success: true,
          amount,
          reference,
        };
      } else {
        return {
          success: false,
          message: result.message || "Top-up verification failed",
        };
      }
    } catch (error) {
      console.error("Wallet top-up verification error:", error);
      return {
        success: false,
        message: "Failed to verify wallet top-up",
      };
    }
  }

  async transferBetweenUsers(
    fromUserId: string,
    toUserId: string,
    amount: number,
    description: string
  ): Promise<{ success: boolean; message: string }> {
    if (amount <= 0) {
      return { success: false, message: "Amount must be positive" };
    }

    const fromBalance = await this.getBalance(fromUserId);
    if (fromBalance < amount) {
      return { success: false, message: "Insufficient wallet balance" };
    }

    try {
      // Debit sender
      await this.addTransaction(
        fromUserId,
        -amount,
        "debit",
        "transfer_out",
        `Transfer to user: ${description}`,
      );

      // Credit receiver
      await this.addTransaction(
        toUserId,
        amount,
        "credit",
        "transfer_in",
        `Transfer from user: ${description}`,
      );

      return { success: true, message: "Transfer completed successfully" };
    } catch (error) {
      console.error("Wallet transfer error:", error);
      return { success: false, message: "Transfer failed" };
    }
  }

  async setWalletLimit(userId: string, dailyLimit: number, monthlyLimit: number): Promise<void> {
    // This would require additional table/fields to store wallet limits
    // For now, we'll just validate against hardcoded limits
    const MAX_DAILY_LIMIT = 50000; // ₦50,000
    const MAX_MONTHLY_LIMIT = 500000; // ₦500,000

    if (dailyLimit > MAX_DAILY_LIMIT || monthlyLimit > MAX_MONTHLY_LIMIT) {
      throw new Error("Limit exceeds maximum allowed");
    }

    // Store limits in user preferences or separate table
    // Implementation depends on requirements
  }

  async getTransactionHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    type?: "credit" | "debit"
  ): Promise<WalletTransaction[]> {
    const transactions = await storage.getWalletTransactions(userId);

    // Filter by date range and type
    return transactions.filter(transaction => {
      let include = true;

      if (startDate && new Date(transaction.createdAt!) < startDate) {
        include = false;
      }

      if (endDate && new Date(transaction.createdAt!) > endDate) {
        include = false;
      }

      if (type && transaction.type !== type) {
        include = false;
      }

      return include;
    });
  }

  async generateStatement(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const transactions = await this.getTransactionHistory(userId, startDate, endDate);

    const statement = {
      userId,
      period: { startDate, endDate },
      openingBalance: 0, // Would need to calculate based on transactions before startDate
      closingBalance: await this.getBalance(userId),
      totalCredits: 0,
      totalDebits: 0,
      transactionCount: transactions.length,
      transactions,
    };

    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      if (transaction.type === "credit") {
        statement.totalCredits += amount;
      } else {
        statement.totalDebits += Math.abs(amount);
      }
    });

    return statement;
  }

  private generateTransactionReference(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  async freezeWallet(userId: string, reason: string): Promise<void> {
    // This would require additional wallet status field
    // For now, we'll just send a notification
    await notificationService.createNotification({
      userId,
      title: "Wallet Frozen",
      message: `Your wallet has been temporarily frozen. Reason: ${reason}. Please contact support.`,
      type: "system",
      priority: "high",
    });
  }

  async unfreezeWallet(userId: string): Promise<void> {
    // Unfreeze wallet and notify user
    await notificationService.createNotification({
      userId,
      title: "Wallet Unfrozen",
      message: "Your wallet has been unfrozen and is now active.",
      type: "system",
    });
  }
}

export const walletService = new WalletService();
