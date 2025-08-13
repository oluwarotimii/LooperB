import { storage } from "../storage";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createInsertSchema } from "drizzle-zod";
import { users } from "../../shared/schema";
import { OAuth2Client } from 'google-auth-library';

const createUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string(),
});

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);

export const authService = {
  async register(userData: z.infer<typeof createUserSchema>) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser = {
      ...userData,
      password: hashedPassword,
    };
    return await storage.createUser(newUser);
  },

  async login(email: string, password: string) {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    await storage.updateUser(user.id, { refreshToken });

    return { user, token, refreshToken };
  },

  async googleLogin(idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error("Invalid Google ID token");
    }

    let user = await storage.getUserByEmail(payload.email);
    if (!user) {
      // Register new user if not found
      user = await storage.createUser({
        email: payload.email,
        fullName: payload.name || payload.email,
        password: bcrypt.hashSync(uuidv4(), 10), // Generate a random password for OAuth users
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    await storage.updateUser(user.id, { refreshToken });

    return { user, token, refreshToken };
  },

  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded: any = jwt.verify(refreshToken, process.env.JWT_SECRET!);
      const user = await storage.getUser(decoded.id);

      if (!user || user.refreshToken !== refreshToken) {
        throw new Error("Invalid refresh token");
      }

      const newAccessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, {
        expiresIn: "1h",
      });

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  },
};