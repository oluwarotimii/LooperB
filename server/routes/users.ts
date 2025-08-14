import { Router } from 'express';
import { z } from 'zod';
import { userService } from '../services/userService';
import { impactService } from '../services/impactService';
import { referralService } from '../services/referralService';
import { validateRequest, validateQuery } from '../middleware/validation';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile, impact, and favorites management
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.get('/profile', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await userService.getUserProfile(userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [consumer, business_owner]
 *     responses:
 *       200:
 *         description: Updated user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put('/profile', authenticateJWT, validateRequest(z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["consumer", "business_owner"]).optional(),
})), async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await userService.updateUserProfile(userId, req.body);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile" });
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   delete:
 *     summary: Delete user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.delete('/profile', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id;
    await userService.deleteUserProfile(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user profile" });
  }
});

/**
 * @swagger
 * /api/users/impact:
 *   get:
 *     summary: Get user impact data
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User impact data
 */
router.get('/impact', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const impact = await impactService.getUserImpact(userId);
    res.json(impact);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch impact data" });
  }
});

/**
 * @swagger
 * /api/users/favorites:
 *   get:
 *     summary: Get user favorites
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [business, listing]
 *         description: The type of favorite to retrieve
 *     responses:
 *       200:
 *         description: A list of user favorites
 */
router.get('/favorites', authenticateJWT, validateQuery(z.object({
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

/**
 * @swagger
 * /api/users/favorites:
 *   post:
 *     summary: Add a favorite
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entityId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [business, listing]
 *     responses:
 *       200:
 *         description: Favorite added successfully
 */
router.post('/favorites', authenticateJWT, validateRequest(z.object({
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

/**
 * @swagger
 * /api/users/favorites/{entityId}:
 *   delete:
 *     summary: Remove a favorite
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the entity to remove from favorites
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [business, listing]
 *         description: The type of favorite to remove
 *     responses:
 *       200:
 *         description: Favorite removed successfully
 */
router.delete('/favorites/:entityId', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { entityId } = req.params;
    const { type } = req.query;
    await userService.removeFavorite(userId, entityId, type as "business" | "listing");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove favorite" });
  }
});

/**
 * @swagger
 * /api/users/refer:
 *   post:
 *     summary: Create a referral
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               referredEmail:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Referral created successfully
 */
router.post('/refer', authenticateJWT, validateRequest(z.object({
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

/**
 * @swagger
 * /api/users/referrals:
 *   get:
 *     summary: Get user referrals
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of user referrals
 */
router.get('/referrals', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const referrals = await referralService.getReferralsByUser(userId);
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch referrals" });
  }
});

/**
 * @swagger
 * /api/users/points-history:
 *   get:
 *     summary: Get user points history
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of user points history
 */
router.get('/points-history', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const pointsHistory = await referralService.getPointsHistory(userId);
    res.json(pointsHistory);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch points history" });
  }
});

export default router;