import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo",
  api_key: process.env.CLOUDINARY_API_KEY || "demo",
  api_secret: process.env.CLOUDINARY_API_SECRET || "demo",
});

// Custom storage implementation that uploads to Cloudinary
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed') as any, false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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

export { cloudinary };