import { Router } from 'express';
import { z } from 'zod';
import { reviewService } from '../services/reviewService';
import { validateRequest, validateQuery } from '../middleware/validation';
import { authenticateJWT } from '../middleware/auth';
import { upload } from '../utils/fileUpload';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Review and feedback management - Rate experiences, leave comments
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a review for an order
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - businessId
 *               - rating
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID being reviewed
 *               businessId:
 *                 type: string
 *                 description: Business ID being reviewed
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5 stars
 *               comment:
 *                 type: string
 *                 description: Written review comment
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Photo attachments for the review
 *     responses:
 *       200:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       400:
 *         description: Invalid review data
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateJWT, upload.array('photos'), validateRequest(z.object({
  orderId: z.string(),
  businessId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
})), async (req: any, res) => {
  try {
    const userId = req.user.id;
    const photos = req.files?.map((file: any) => file.path) || [];
    const review = await reviewService.createReview(userId, {
      ...req.body,
      photos
    });
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: "Failed to create review" });
  }
});

/**
 * @swagger
 * /api/reviews/business/{businessId}:
 *   get:
 *     summary: Get reviews for a business
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reviews per page
 *     responses:
 *       200:
 *         description: List of business reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 */
router.get('/business/:businessId', validateQuery(z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
})), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const reviews = await reviewService.getBusinessReviews(
      req.params.businessId,
      Number(page),
      Number(limit)
    );
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch business reviews" });
  }
});

/**
 * @swagger
 * /api/reviews/user/{userId}:
 *   get:
 *     summary: Get reviews by a user
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of user reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 */
router.get('/user/:userId', authenticateJWT, async (req, res) => {
  try {
    const reviews = await reviewService.getUserReviews(req.params.userId);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user reviews" });
  }
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Update a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found
 */
router.put('/:id', authenticateJWT, validateRequest(z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
})), async (req: any, res) => {
  try {
    const userId = req.user.id;
    const review = await reviewService.updateReview(req.params.id, userId, req.body);
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: "Failed to update review" });
  }
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found
 */
router.delete('/:id', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id;
    await reviewService.deleteReview(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete review" });
  }
});

export default router;