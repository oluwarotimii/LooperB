import { Router } from 'express';
import { z } from 'zod';
import { messageService } from '../services/messageService';
import { validateRequest, validateQuery } from '../middleware/validation';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Real-time messaging between users and businesses
 */

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get user messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *         description: Filter messages by business ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter messages by type
 *     responses:
 *       200:
 *         description: A list of user messages
 */
router.get('/', authenticateJWT, validateQuery(z.object({
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

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receiverId:
 *                 type: string
 *               businessId:
 *                 type: string
 *               orderId:
 *                 type: string
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [support, order_inquiry, business_chat]
 *     responses:
 *       200:
 *         description: Message sent successfully
 */
router.post('/', authenticateJWT, validateRequest(z.object({
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

/**
 * @swagger
 * /api/messages/{id}/read:
 *   put:
 *     summary: Mark a message as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the message to mark as read
 *     responses:
 *       200:
 *         description: Message marked as read successfully
 */
router.put('/:id/read', authenticateJWT, async (req: any, res) => {
  try {
    const message = await messageService.markAsRead(req.params.id);
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to mark message as read" });
  }
});

export default router;
