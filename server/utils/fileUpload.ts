import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}

export class FileUploadService {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = {
    images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    videos: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],
  };
  
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';
  private readonly baseUrl = process.env.CDN_BASE_URL || process.env.BASE_URL || 'http://localhost:5000';

  constructor() {
    this.ensureUploadDirectory();
  }

  async uploadImage(file: UploadedFile, folder: string = 'images'): Promise<UploadResult> {
    try {
      // Validate file type
      if (!this.allowedMimeTypes.images.includes(file.mimetype)) {
        return {
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.',
        };
      }

      // Validate file size
      if (file.size > this.maxFileSize) {
        return {
          success: false,
          error: `File size exceeds limit of ${this.maxFileSize / (1024 * 1024)}MB`,
        };
      }

      const result = await this.saveFile(file, folder);
      
      // In production, you would also:
      // 1. Optimize/compress the image
      // 2. Generate thumbnails
      // 3. Upload to cloud storage (S3, Cloudinary, etc.)
      
      return result;
    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: 'Failed to upload image',
      };
    }
  }

  async uploadDocument(file: UploadedFile, folder: string = 'documents'): Promise<UploadResult> {
    try {
      if (!this.allowedMimeTypes.documents.includes(file.mimetype)) {
        return {
          success: false,
          error: 'Invalid file type. Only PDF and Word documents are allowed.',
        };
      }

      if (file.size > this.maxFileSize) {
        return {
          success: false,
          error: `File size exceeds limit of ${this.maxFileSize / (1024 * 1024)}MB`,
        };
      }

      return await this.saveFile(file, folder);
    } catch (error) {
      console.error('Document upload error:', error);
      return {
        success: false,
        error: 'Failed to upload document',
      };
    }
  }

  async uploadVideo(file: UploadedFile, folder: string = 'videos'): Promise<UploadResult> {
    try {
      if (!this.allowedMimeTypes.videos.includes(file.mimetype)) {
        return {
          success: false,
          error: 'Invalid file type. Only MP4, MPEG, QuickTime, and WebM videos are allowed.',
        };
      }

      const videoMaxSize = 50 * 1024 * 1024; // 50MB for videos
      if (file.size > videoMaxSize) {
        return {
          success: false,
          error: `Video size exceeds limit of ${videoMaxSize / (1024 * 1024)}MB`,
        };
      }

      return await this.saveFile(file, folder);
    } catch (error) {
      console.error('Video upload error:', error);
      return {
        success: false,
        error: 'Failed to upload video',
      };
    }
  }

  async uploadMultipleImages(files: UploadedFile[], folder: string = 'images'): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (const file of files) {
      const result = await this.uploadImage(file, folder);
      results.push(result);
    }
    
    return results;
  }

  async deleteFile(filename: string, folder: string = 'images'): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadDir, folder, filename);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }

  async getFileInfo(filename: string, folder: string = 'images'): Promise<{
    exists: boolean;
    size?: number;
    mimeType?: string;
    url?: string;
  }> {
    try {
      const filePath = path.join(this.uploadDir, folder, filename);
      const stats = await fs.stat(filePath);
      
      return {
        exists: true,
        size: stats.size,
        mimeType: this.getMimeTypeFromExtension(path.extname(filename)),
        url: `${this.baseUrl}/uploads/${folder}/${filename}`,
      };
    } catch (error) {
      return { exists: false };
    }
  }

  private async saveFile(file: UploadedFile, folder: string): Promise<UploadResult> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(6).toString('hex');
      const extension = path.extname(file.originalname);
      const filename = `${timestamp}-${randomString}${extension}`;
      
      // Ensure folder exists
      const folderPath = path.join(this.uploadDir, folder);
      await this.ensureDirectory(folderPath);
      
      // Save file
      const filePath = path.join(folderPath, filename);
      await fs.writeFile(filePath, file.buffer);
      
      const url = `${this.baseUrl}/uploads/${folder}/${filename}`;
      
      return {
        success: true,
        url,
        filename,
      };
    } catch (error) {
      console.error('File save error:', error);
      throw error;
    }
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await this.ensureDirectory(this.uploadDir);
      await this.ensureDirectory(path.join(this.uploadDir, 'images'));
      await this.ensureDirectory(path.join(this.uploadDir, 'documents'));
      await this.ensureDirectory(path.join(this.uploadDir, 'videos'));
      await this.ensureDirectory(path.join(this.uploadDir, 'temp'));
    } catch (error) {
      console.error('Error creating upload directories:', error);
    }
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.mp4': 'video/mp4',
      '.mpeg': 'video/mpeg',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  // Image processing utilities
  async resizeImage(
    inputBuffer: Buffer,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    }
  ): Promise<Buffer> {
    // In production, use Sharp or similar library for image processing
    // For now, return original buffer
    return inputBuffer;
  }

  async generateThumbnail(
    inputBuffer: Buffer,
    size: number = 150
  ): Promise<Buffer> {
    // In production, generate actual thumbnail
    return inputBuffer;
  }

  // Cloud storage integration (for production)
  async uploadToCloudStorage(
    file: UploadedFile,
    folder: string
  ): Promise<UploadResult> {
    try {
      // Example AWS S3 upload
      // const s3 = new AWS.S3();
      // const key = `${folder}/${Date.now()}-${file.originalname}`;
      // const result = await s3.upload({
      //   Bucket: process.env.S3_BUCKET,
      //   Key: key,
      //   Body: file.buffer,
      //   ContentType: file.mimetype,
      // }).promise();
      
      // For now, fall back to local storage
      return await this.saveFile(file, folder);
    } catch (error) {
      console.error('Cloud upload error:', error);
      throw error;
    }
  }

  // File validation utilities
  validateFile(file: UploadedFile, type: 'image' | 'document' | 'video'): {
    valid: boolean;
    error?: string;
  } {
    const allowedTypes = this.allowedMimeTypes[type];
    
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      };
    }
    
    const maxSize = type === 'video' ? 50 * 1024 * 1024 : this.maxFileSize;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`,
      };
    }
    
    return { valid: true };
  }

  // Cleanup utilities
  async cleanupExpiredFiles(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const tempDir = path.join(this.uploadDir, 'temp');
      const files = await fs.readdir(tempDir);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`Cleaned up expired file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byFolder: Record<string, { files: number; size: number }>;
  }> {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      byFolder: {} as Record<string, { files: number; size: number }>,
    };
    
    try {
      const folders = ['images', 'documents', 'videos'];
      
      for (const folder of folders) {
        const folderPath = path.join(this.uploadDir, folder);
        try {
          const files = await fs.readdir(folderPath);
          let folderSize = 0;
          
          for (const file of files) {
            const filePath = path.join(folderPath, file);
            const fileStats = await fs.stat(filePath);
            folderSize += fileStats.size;
          }
          
          stats.byFolder[folder] = {
            files: files.length,
            size: folderSize,
          };
          
          stats.totalFiles += files.length;
          stats.totalSize += folderSize;
        } catch (error) {
          stats.byFolder[folder] = { files: 0, size: 0 };
        }
      }
    } catch (error) {
      console.error('Storage stats error:', error);
    }
    
    return stats;
  }
}

export const fileUploadService = new FileUploadService();
