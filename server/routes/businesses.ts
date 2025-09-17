import { Router } from 'express';
import { z } from 'zod';
import { businessService } from '../services/businessService';
import { listingService } from '../services/listingService';
import { validateRequest, validateQuery } from '../middleware/validation';
import { authenticateJWT, requireBusinessAccess } from '../middleware/auth';
import { upload } from '../utils/fileUpload';
import { logger } from '../utils/logger'; // Added this line

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Businesses
 *   description: Business management and discovery
 */

/**
 * @swagger
 * /api/businesses/search:
 *   get:
 *     summary: Search for businesses
 *     tags: [Businesses]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: string
 *         description: User latitude for location filtering
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: string
 *         description: User longitude for location filtering
 *       - in: query
 *         name: radius
 *         schema:
 *           type: string
 *         description: Search radius in kilometers
 *       - in: query
 *         name: businessType
 *         schema:
 *           type: string
 *           enum: [restaurant, hotel, bakery, supermarket, cafe, caterer]
 *         description: Filter by business type
 *     responses:
 *       200:
 *         description: List of matching businesses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Business'
 */
router.get('/search', validateQuery(z.object({
  q: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  radius: z.string().optional(),
  businessType: z.string().optional(),
})), async (req, res) => {
  try {
    const businesses = await businessService.searchBusinesses(req.query);
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ message: "Failed to search businesses" });
  }
});

router.get('/my', authenticateJWT, async (req: any, res) => {
  logger.info('Businesses Route: Handler entered', { userId: req.userId });
  try {
    const userId = req.user.id;
    const businesses = await businessService.getUserBusinesses(userId);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(businesses));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch businesses" });
  }
});

/**
 * @swagger
 * /api/businesses/{id}:
 *   get:
 *     summary: Get business details
 *     tags: [Businesses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Business'
 *       404:
 *         description: Business not found
 */
router.get('/:id', async (req, res) => {
  try {
    const business = await businessService.getBusinessDetails(req.params.id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch business" });
  }
});

/**
 * @swagger
 * /api/businesses:
 *   post:
 *     summary: Create a new business
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - address
 *               - businessType
 *             properties:
 *               businessName:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               latitude:
 *                 type: string
 *               longitude:
 *                 type: string
 *               businessType:
 *                 type: string
 *                 enum: [restaurant, hotel, bakery, supermarket, cafe, caterer]
 *               openingHours:
 *                 type: object
 *               logo:
 *                 type: string
 *                 format: binary
 *               coverImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Business created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateJWT, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]), validateRequest(z.object({
  businessName: z.string(),
  description: z.string().optional(),
  address: z.string(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  businessType: z.enum(["restaurant", "hotel", "bakery", "supermarket", "cafe", "caterer"]),
  openingHours: z.record(z.any()).optional(),
})), async (req: any, res) => {
  try {
    const userId = req.user.id;
    const logoUrl = req.files?.logo?.[0]?.path;
    const coverImageUrl = req.files?.coverImage?.[0]?.path;
    const business = await businessService.createBusiness(userId, { ...req.body, logoUrl, coverImageUrl });
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: "Failed to create business" });
  }
});

/**
 * @swagger
 * /api/businesses/my:
 *   get:
 *     summary: Get user's businesses
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's businesses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Business'
 */
router.get('/my', authenticateJWT, async (req: any, res) => {
  res.send('Handler reached!');
});

/**
 * @swagger
 * /api/businesses/{businessId}/listings:
 *   get:
 *     summary: Get business listings
 *     tags: [Businesses]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: List of business listings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 */
router.get('/:businessId/listings', async (req, res) => {
  try {
    const listings = await listingService.getBusinessListings(req.params.businessId);
    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch business listings" });
  }
});

/**
 * @swagger
 * /api/businesses/{id}:
 *   put:
 *     summary: Update a business
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               latitude:
 *                 type: string
 *               longitude:
 *                 type: string
 *               businessType:
 *                 type: string
 *                 enum: [restaurant, hotel, bakery, supermarket, cafe, caterer]
 *               openingHours:
 *                 type: object
 *               logo:
 *                 type: string
 *                 format: binary
 *               coverImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Business updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Business not found
 */
router.put('/:id', authenticateJWT, requireBusinessAccess, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]), validateRequest(z.object({
  businessName: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  businessType: z.enum(["restaurant", "hotel", "bakery", "supermarket", "cafe", "caterer"]).optional(),
  openingHours: z.record(z.any()).optional(),
})), async (req: any, res) => {
  try {
    const logoUrl = req.files?.logo?.[0]?.path;
    const coverImageUrl = req.files?.coverImage?.[0]?.path;
    const business = await businessService.updateBusiness(req.params.id, { ...req.body, logoUrl, coverImageUrl });
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: "Failed to update business" });
  }
});

/**
 * @swagger
 * /api/businesses/{id}:
 *   delete:
 *     summary: Delete a business
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Business not found
 */
router.delete('/:id', authenticateJWT, requireBusinessAccess, async (req: any, res) => {
  try {
    await businessService.deleteBusiness(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete business" });
  }
});

export default router;
