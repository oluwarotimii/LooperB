import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { logger } from "./logger";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dzu8cpqyq",
  api_key: process.env.CLOUDINARY_API_KEY || "686539899237915",
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Custom storage implementation that uploads to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/mov',
    'video/avi',
    'application/pdf'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn('File upload rejected - invalid type', {
      filename: file.originalname,
      mimetype: file.mimetype
    });
    cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed.'), false);
  }
};

export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  }
});

// Helper function to upload buffer to Cloudinary
export const uploadToCloudinary = async (buffer: Buffer, options: {
  folder?: string;
  public_id?: string;
  transformation?: any[];
} = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "looper",
        transformation: options.transformation || [
          { width: 1000, height: 1000, crop: 'limit', quality: 'auto' }
        ],
        ...options
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

// Enhanced Cloudinary service with production optimizations
export class CloudinaryService {
  static async uploadBuffer(buffer: Buffer, options: {
    folder?: string;
    public_id?: string;
    transformation?: any[];
    resource_type?: 'image' | 'video' | 'raw';
  } = {}): Promise<any> {
    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: options.folder || "looper",
            public_id: options.public_id,
            resource_type: options.resource_type || 'auto',
            transformation: options.transformation || [
              { width: 1000, height: 1000, crop: 'limit', quality: 'auto:good' },
              { fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload failed', error);
              reject(error);
            } else {
              logger.info('File uploaded to Cloudinary', {
                publicId: result?.public_id,
                secureUrl: result?.secure_url,
                folder: options.folder
              });
              resolve(result);
            }
          }
        ).end(buffer);
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to upload to Cloudinary', error as Error);
      throw new Error('File upload failed');
    }
  }

  static async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      logger.info('File deleted from Cloudinary', { publicId });
    } catch (error) {
      logger.error('Failed to delete file from Cloudinary', error as Error);
      throw new Error('File deletion failed');
    }
  }

  static generateOptimizedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
  } = {}): string {
    return cloudinary.url(publicId, {
      width: options.width || 500,
      height: options.height || 500,
      crop: options.crop || 'auto',
      gravity: 'auto',
      fetch_format: 'auto',
      quality: options.quality || 'auto:good'
    });
  }

  static generateThumbnail(publicId: string, size: number = 200): string {
    return cloudinary.url(publicId, {
      width: size,
      height: size,
      crop: 'thumb',
      gravity: 'auto',
      fetch_format: 'auto',
      quality: 'auto:good'
    });
  }
}

export { cloudinary };