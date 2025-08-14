import { Router } from 'express';
import { z } from 'zod';
import { PaymentService } from '../services/paymentService';
import { walletService } from '../services/walletService';
import { validateRequest } from '../middleware/validation';
import { authenticateJWT } from '../middleware/auth';

const router = Router();
const paymentService = new PaymentService();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing with Paystack and wallet management
 */

/**
 * @swagger
 * /api/payment/initialize:
 *   post:
 *     summary: Initialize payment with Paystack
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - amount
 *               - email
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID for payment
 *               amount:
 *                 type: number
 *                 description: Payment amount in kobo (Nigerian cents)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Customer email
 *               useWallet:
 *                 type: boolean
 *                 description: Use wallet balance for partial payment
 *     responses:
 *       200:
 *         description: Payment initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authorization_url:
 *                   type: string
 *                 access_code:
 *                   type: string
 *                 reference:
 *                   type: string
 *       400:
 *         description: Invalid payment data
 *       401:
 *         description: Unauthorized
 */
router.post('/initialize', authenticateJWT, validateRequest(z.object({
  orderId: z.string(),
  amount: z.number(),
  email: z.string().email(),
  useWallet: z.boolean().optional(),
})), async (req: any, res) => {
  try {
    const userId = req.user.id;
    const result = await paymentService.initializePayment(
      req.body.orderId,
      req.body.amount,
      req.body.email,
      userId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to initialize payment" });
  }
});

/**
 * @swagger
 * /api/payment/verify:
 *   post:
 *     summary: Verify payment transaction
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reference
 *             properties:
 *               reference:
 *                 type: string
 *                 description: Payment reference from Paystack
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *       400:
 *         description: Payment verification failed
 */
router.post('/verify', authenticateJWT, validateRequest(z.object({
  reference: z.string(),
})), async (req: any, res) => {
  try {
    const result = await paymentService.verifyPayment(req.body.reference);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to verify payment" });
  }
});

/**
 * @swagger
 * /api/wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current wallet balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                 currency:
 *                   type: string
 */
router.get('/wallet/balance', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const balance = await walletService.getUserWalletBalance(userId);
    res.json({ balance, currency: 'NGN' });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch wallet balance" });
  }
});

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get wallet transaction history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of wallet transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WalletTransaction'
 */
router.get('/wallet/transactions', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const transactions = await walletService.getTransactionHistory(userId);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch transaction history" });
  }
});

/**
 * @swagger
 * /api/wallet/topup:
 *   post:
 *     summary: Top up wallet balance
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to add to wallet (in kobo)
 *     responses:
 *       200:
 *         description: Wallet top-up initiated
 *       400:
 *         description: Invalid amount
 */
router.post('/wallet/topup', authenticateJWT, validateRequest(z.object({
  amount: z.number().min(100), // Minimum 1 NGN
})), async (req: any, res) => {
  try {
    const userId = req.user.id;
    const result = await walletService.initializeTopup(userId, req.body.amount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to initiate wallet top-up" });
  }
});

export default router;