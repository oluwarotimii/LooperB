import { Router } from 'express';
import { storage } from '../storage';
import { authenticateJWT } from '../middleware/auth';
import { upload, uploadToCloudinary, cloudinary } from '../utils/fileUpload';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: General
 *   description: General utility endpoints
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API is healthy
 */
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /api/dietary-tags:
 *   get:
 *     summary: Get all dietary tags
 *     tags: [General]
 *     responses:
 *       200:
 *         description: A list of dietary tags
 */
router.get('/dietary-tags', async (req, res) => {
  try {
    const tags = await storage.getDietaryTags();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch dietary tags" });
  }
});

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [General]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *               public_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: File uploaded successfully
 */
router.post('/upload', authenticateJWT, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: req.body.folder || 'looper',
      public_id: req.body.public_id
    });

    res.json({ 
      url: (result as any).secure_url,
      publicId: (result as any).public_id,
      optimizedUrl: cloudinary.url((result as any).public_id, {
        width: 500,
        height: 500,
        crop: 'auto',
        gravity: 'auto',
        fetch_format: 'auto',
        quality: 'auto:good'
      })
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
});

export default router;
