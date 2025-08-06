import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Extend the Request interface to include business access info
declare global {
  namespace Express {
    interface Request {
      businessAccess?: {
        businessId: string;
        role: "owner" | "manager" | "staff";
      };
    }
  }
}

// Middleware to check if user has access to a specific business
export function requireBusinessAccess(req: Request, res: Response, next: NextFunction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get businessId from params or body
      const businessId = req.params.businessId || req.params.id || req.body.businessId;
      if (!businessId) {
        return res.status(400).json({ message: "Business ID required" });
      }

      // Check if user has access to this business
      const userBusinesses = await storage.getUserBusinesses(userId);
      const businessAccess = userBusinesses.find(b => b.id === businessId);
      
      if (!businessAccess) {
        return res.status(403).json({ message: "Access denied to this business" });
      }

      // Get user's role in this business
      const businessUsers = await storage.getBusinessUsers(businessId);
      const userRole = businessUsers.find(bu => bu.userId === userId);

      if (!userRole) {
        return res.status(403).json({ message: "No role found for this business" });
      }

      // Add business access info to request
      req.businessAccess = {
        businessId,
        role: userRole.role,
      };

      next();
    } catch (error) {
      console.error("Business access check error:", error);
      res.status(500).json({ message: "Error checking business access" });
    }
  };
}

// Middleware to require specific role within a business
export function requireRole(allowedRoles: ("owner" | "manager" | "staff")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.businessAccess) {
      return res.status(500).json({ message: "Business access check must run first" });
    }

    if (!allowedRoles.includes(req.businessAccess.role)) {
      return res.status(403).json({ 
        message: `Insufficient permissions. Required: ${allowedRoles.join(', ')}, Current: ${req.businessAccess.role}` 
      });
    }

    next();
  };
}

// Middleware to check if user is admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.claims?.sub;
  
  // In a real implementation, you would check if the user has admin role
  // For now, we'll check if user type is admin
  storage.getUser(userId).then(user => {
    if (!user || user.userType !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  }).catch(error => {
    console.error("Admin check error:", error);
    res.status(500).json({ message: "Error checking admin access" });
  });
}

// Middleware to check if user owns a resource (order, review, etc.)
export function requireResourceOwnership(resourceType: "order" | "review" | "message") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const resourceId = req.params.id;
      if (!resourceId) {
        return res.status(400).json({ message: "Resource ID required" });
      }

      let resource;
      switch (resourceType) {
        case "order":
          resource = await storage.getOrder(resourceId);
          break;
        case "review":
          // This would require a getReview method in storage
          resource = null; // Placeholder
          break;
        case "message":
          // This would require a getMessage method in storage
          resource = null; // Placeholder
          break;
        default:
          return res.status(400).json({ message: "Invalid resource type" });
      }

      if (!resource) {
        return res.status(404).json({ message: `${resourceType} not found` });
      }

      // Check ownership based on resource type
      let isOwner = false;
      switch (resourceType) {
        case "order":
          isOwner = resource.userId === userId;
          break;
        case "review":
          isOwner = (resource as any).userId === userId;
          break;
        case "message":
          isOwner = (resource as any).senderId === userId || (resource as any).receiverId === userId;
          break;
      }

      if (!isOwner) {
        return res.status(403).json({ message: `Access denied to this ${resourceType}` });
      }

      next();
    } catch (error) {
      console.error(`Resource ownership check error for ${resourceType}:`, error);
      res.status(500).json({ message: "Error checking resource ownership" });
    }
  };
}

// Middleware to check if user can access order (owner or business staff)
export function requireOrderAccess(req: Request, res: Response, next: NextFunction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const orderId = req.params.id || req.params.orderId;
      if (!orderId) {
        return res.status(400).json({ message: "Order ID required" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if user is the order owner
      if (order.userId === userId) {
        return next();
      }

      // Check if user is part of the business
      const userBusinesses = await storage.getUserBusinesses(userId);
      const hasBusinessAccess = userBusinesses.some(b => b.id === order.businessId);

      if (!hasBusinessAccess) {
        return res.status(403).json({ message: "Access denied to this order" });
      }

      next();
    } catch (error) {
      console.error("Order access check error:", error);
      res.status(500).json({ message: "Error checking order access" });
    }
  };
}

// Middleware to check if business is verified
export function requireVerifiedBusiness(req: Request, res: Response, next: NextFunction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.businessAccess) {
        return res.status(500).json({ message: "Business access check must run first" });
      }

      const business = await storage.getBusiness(req.businessAccess.businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      if (business.verificationStatus !== "verified") {
        return res.status(403).json({ 
          message: "Business must be verified to perform this action",
          verificationStatus: business.verificationStatus 
        });
      }

      next();
    } catch (error) {
      console.error("Business verification check error:", error);
      res.status(500).json({ message: "Error checking business verification" });
    }
  };
}

// Middleware to check if user account is verified
export function requireVerifiedAccount(req: Request, res: Response, next: NextFunction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.isVerified) {
        return res.status(403).json({ 
          message: "Account verification required",
          verificationRequired: true 
        });
      }

      next();
    } catch (error) {
      console.error("Account verification check error:", error);
      res.status(500).json({ message: "Error checking account verification" });
    }
  };
}

// Middleware to check API key for external integrations
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ message: "API key required" });
  }

  // In a real implementation, you would validate the API key against a database
  const validApiKey = process.env.LOOPER_API_KEY;
  
  if (apiKey !== validApiKey) {
    return res.status(401).json({ message: "Invalid API key" });
  }

  next();
}

// Middleware to log access attempts for audit purposes
export function auditLog(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.claims?.sub;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    
    // Log the access attempt
    console.log(`Audit Log: ${action}`, {
      userId,
      ip,
      userAgent,
      timestamp: new Date(),
      path: req.path,
      method: req.method,
    });
    
    next();
  };
}

// Middleware to prevent actions on inactive/suspended accounts
export function requireActiveAccount(req: Request, res: Response, next: NextFunction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if account is active (you might have additional status fields)
      // For now, we'll check if user is verified
      if (!user.isVerified) {
        return res.status(403).json({ 
          message: "Account is inactive or suspended",
          accountStatus: "inactive" 
        });
      }

      next();
    } catch (error) {
      console.error("Active account check error:", error);
      res.status(500).json({ message: "Error checking account status" });
    }
  };
}
