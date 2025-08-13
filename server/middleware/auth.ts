import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";

export const verifyToken = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "A token is required for authentication" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
  } catch (err) {
    return res.status(401).json({ message: "Invalid Token" });
  }

  return next();
};

export const requireRole = (role: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    const user = await storage.getUser(req.user.id);

    if (!user || user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};

export const requireBusinessAccess = async (req: any, res: Response, next: NextFunction) => {
  const userId = req.user.id;
  const businessId = req.params.id || req.body.businessId;

  if (!businessId) {
    return res.status(400).json({ message: "Business ID is required" });
  }

  const hasAccess = await storage.userHasAccessToBusiness(userId, businessId);

  if (!hasAccess) {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};