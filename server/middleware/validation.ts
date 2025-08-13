import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          message: "Validation failed",
          errors,
        });
      }
      
      req.body = result.data;
      next();
    } catch (error) {
      res.status(400).json({
        message: "Invalid request data",
      });
    }
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          message: "Query validation failed",
          errors,
        });
      }
      
      req.query = result.data;
      next();
    } catch (error) {
      res.status(400).json({
        message: "Invalid query parameters",
      });
    }
  };
}

export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          message: "Parameter validation failed",
          errors,
        });
      }
      
      req.params = result.data;
      next();
    } catch (error) {
      res.status(400).json({
        message: "Invalid parameters",
      });
    }
  };
}

// Common validation schemas
export const commonSchemas = {
  uuid: z.string().uuid("Invalid ID format"),
  
  email: z.string().email("Invalid email format"),
  
  phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,}$/, "Invalid phone number format"),
  
  pagination: z.object({
    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  }),
  
  coordinates: z.object({
    latitude: z.string().transform(val => parseFloat(val)).pipe(z.number().min(-90).max(90)),
    longitude: z.string().transform(val => parseFloat(val)).pipe(z.number().min(-180).max(180)),
  }),
  
  dateRange: z.object({
    startDate: z.string().pipe(z.coerce.date()).optional(),
    endDate: z.string().pipe(z.coerce.date()).optional(),
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  }, "Start date must be before end date"),
  
  price: z.string().transform(val => parseFloat(val)).pipe(z.number().positive("Price must be positive")),
  
  rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
};

// Rate limiting validation
export function validateRateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requests.get(clientId) || { count: 0, resetTime: now + windowMs };
    
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + windowMs;
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        message: "Too many requests",
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      });
    }
    
    clientData.count++;
    requests.set(clientId, clientData);
    
    next();
  };
}

// File upload validation
export function validateFileUpload(
  allowedMimeTypes: string[],
  maxFileSize: number,
  maxFiles: number = 1
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        message: "No files uploaded",
      });
    }
    
    const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
    
    if (files.length > maxFiles) {
      return res.status(400).json({
        message: `Maximum ${maxFiles} files allowed`,
      });
    }
    
    for (const file of files) {
      if (!file) continue;
      
      // Check file size
      if (file.size > maxFileSize) {
        return res.status(400).json({
          message: `File size exceeds ${maxFileSize} bytes`,
        });
      }
      
      // Check mime type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          message: `File type ${file.mimetype} not allowed`,
          allowedTypes: allowedMimeTypes,
        });
      }
    }
    
    next();
  };
}

// Business hours validation
export const businessHoursSchema = z.object({
  monday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    closed: z.boolean().optional(),
  }).optional(),
  tuesday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    closed: z.boolean().optional(),
  }).optional(),
  wednesday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    closed: z.boolean().optional(),
  }).optional(),
  thursday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    closed: z.boolean().optional(),
  }).optional(),
  friday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    closed: z.boolean().optional(),
  }).optional(),
  saturday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    closed: z.boolean().optional(),
  }).optional(),
  sunday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    closed: z.boolean().optional(),
  }).optional(),
});

// Custom validation for Nigerian context
export const nigerianValidations = {
  phoneNumber: z.string().regex(
    /^(\+234|234|0)[7-9][0-1][0-9]{8}$/,
    "Invalid Nigerian phone number format"
  ),
  
  bankAccount: z.string().regex(
    /^[0-9]{10}$/,
    "Bank account number must be 10 digits"
  ),
  
  businessRegistration: z.string().min(5, "Business registration number is required"),
  
  location: z.object({
    state: z.enum([
      "Lagos", "Abuja", "Rivers", "Kano", "Kaduna", "Oyo", "Delta", "Imo",
      "Anambra", "Edo", "Ogun", "Cross River", "Enugu", "Abia", "Akwa Ibom",
      // Add more Nigerian states as needed
    ]),
    lga: z.string().min(2, "Local Government Area is required"),
  }),
};

// Error formatting helper
export function formatValidationError(error: z.ZodError) {
  return {
    message: "Validation failed",
    errors: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
}
