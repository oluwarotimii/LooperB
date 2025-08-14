import { Router } from 'express';
import { z } from 'zod';
import { listingService } from '../services/listingService';
import { validateRequest, validateQuery } from '../middleware/validation';
import { authenticateJWT, requireBusinessAccess } from '../middleware/auth';
import { upload } from '../utils/fileUpload';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Listings
 *   description: Food listing management - Browse deals, create listings
 */

/**
 * @swagger
 * /api/listings/search:
 *   get:
 *     summary: Search for food listings (Browse deals)
 *     tags: [Listings]
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
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: string
 *         description: Maximum price filter
 *       - in: query
 *         name: dietaryTags
 *         schema:
 *           type: string
 *         description: Comma-separated dietary tags
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [expiry, price, rating, distance]
 *         description: Sort listings by criteria
 *     responses:
 *       200:
 *         description: List of matching food listings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 */
router.get('/search', validateQuery(z.object({
  q: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  radius: z.string().optional(),
  businessType: z.string().optional(),
  maxPrice: z.string().optional(),
  dietaryTags: z.string().optional(),
  sortBy: z.enum(["expiry", "price", "rating", "distance"]).optional(),
})), async (req, res) => {
  try {
    const listings = await listingService.searchListings(req.query);
    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: "Failed to search listings" });
  }
});

/**
 * @swagger
 * /api/listings/{id}:
 *   get:
 *     summary: Get listing details
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Listing details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       404:
 *         description: Listing not found
 */
router.get('/:id', async (req, res) => {
  try {
    const listing = await listingService.getListingDetails(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    res.json(listing);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch listing" });
  }
});

/**
 * @swagger
 * /api/listings:
 *   post:
 *     summary: Create a new food listing (Business only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - businessId
 *               - title
 *               - listingType
 *               - originalPrice
 *               - discountedPrice
 *               - quantity
 *               - pickupWindowStart
 *               - pickupWindowEnd
 *             properties:
 *               businessId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               listingType:
 *                 type: string
 *                 enum: [individual, whoop_bag, chef_special, mystery_box]
 *               originalPrice:
 *                 type: string
 *               discountedPrice:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               pickupWindowStart:
 *                 type: string
 *                 format: date-time
 *               pickupWindowEnd:
 *                 type: string
 *                 format: date-time
 *               allergenInfo:
 *                 type: string
 *               ingredients:
 *                 type: string
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Listing created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateJWT, requireBusinessAccess, upload.array('media'), validateRequest(z.object({
  businessId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  listingType: z.enum(["individual", "whoop_bag", "chef_special", "mystery_box"]),
  originalPrice: z.string(),
  discountedPrice: z.string(),
  quantity: z.number(),
  pickupWindowStart: z.string(),
  pickupWindowEnd: z.string(),
  allergenInfo: z.string().optional(),
  ingredients: z.string().optional(),
  dietaryTagIds: z.array(z.string()).optional(),
})), async (req: any, res) => {
  try {
    const media = req.files?.map((file: any) => ({ url: file.path, type: file.mimetype }));
    const listing = await listingService.createListing({ ...req.body, media });
    res.json(listing);
  } catch (error) {
    res.status(500).json({ message: "Failed to create listing" });
  }
});

/**
 * @swagger
 * /api/listings/{id}:
 *   put:
 *     summary: Update a food listing (Business only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               originalPrice:
 *                 type: string
 *               discountedPrice:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               pickupWindowStart:
 *                 type: string
 *                 format: date-time
 *               pickupWindowEnd:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [active, sold_out, expired, cancelled]
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Listing updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Listing not found
 */
router.put('/:id', authenticateJWT, requireBusinessAccess, upload.array('media'), validateRequest(z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  originalPrice: z.string().optional(),
  discountedPrice: z.string().optional(),
  quantity: z.number().optional(),
  availableQuantity: z.number().optional(),
  pickupWindowStart: z.string().optional(),
  pickupWindowEnd: z.string().optional(),
  status: z.enum(["active", "sold_out", "expired", "cancelled"]).optional(),
})), async (req: any, res) => {
  try {
    const media = req.files?.map((file: any) => ({ url: file.path, type: file.mimetype }));
    const listing = await listingService.updateListing(req.params.id, { ...req.body, media });
    res.json(listing);
  } catch (error) {
    res.status(500).json({ message: "Failed to update listing" });
  }
});

/**
 * @swagger
 * /api/listings/{id}:
 *   delete:
 *     summary: Delete a food listing (Business only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Listing deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Listing not found
 */
router.delete('/:id', authenticateJWT, requireBusinessAccess, async (req: any, res) => {
  try {
    await listingService.deleteListing(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete listing" });
  }
});

export default router;
