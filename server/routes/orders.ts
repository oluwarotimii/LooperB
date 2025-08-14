import { Router } from 'express';
import { z } from 'zod';
import { orderService } from '../services/orderService';
import { validateRequest } from '../middleware/validation';
import { authenticateJWT, requireBusinessAccess } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management - Place orders, track pickup, verify completion
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Place a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessId
 *               - items
 *             properties:
 *               businessId:
 *                 type: string
 *                 description: ID of the business
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     listingId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               specialInstructions:
 *                 type: string
 *               useWallet:
 *                 type: boolean
 *                 description: Use wallet balance for payment
 *               pointsToRedeem:
 *                 type: integer
 *                 description: Points to redeem for discount
 *     responses:
 *       200:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid order data
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateJWT, validateRequest(z.object({
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

/**
 * @swagger
 * /api/orders/my:
 *   get:
 *     summary: Get user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
router.get('/my', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const orders = await orderService.getUserOrders(userId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order details
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 */
router.get('/:id', authenticateJWT, async (req: any, res) => {
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

/**
 * @swagger
 * /api/orders/{id}/verify-pickup:
 *   post:
 *     summary: Verify order pickup with QR code
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickupCode
 *             properties:
 *               pickupCode:
 *                 type: string
 *                 description: QR code or pickup verification code
 *     responses:
 *       200:
 *         description: Pickup verified successfully
 *       400:
 *         description: Invalid pickup code
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/verify-pickup', authenticateJWT, requireBusinessAccess, validateRequest(z.object({
  pickupCode: z.string(),
})), async (req: any, res) => {
  try {
    const result = await orderService.verifyPickup(req.params.id, req.body.pickupCode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to verify pickup" });
  }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (Business only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, ready_for_pickup, completed, cancelled]
 *               reason:
 *                 type: string
 *                 description: Reason for status change (if cancelled)
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 */
router.put('/:id/status', authenticateJWT, requireBusinessAccess, validateRequest(z.object({
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

export default router;