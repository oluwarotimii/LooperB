import { storage } from "../storage";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { emailService } from "../utils/emailService";

export class PasswordResetService {
  async requestPasswordReset(email: string): Promise<void> {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // For security, don't reveal if the email doesn't exist
      console.log(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour expiry

    await storage.createPasswordResetToken(email, token, expiresAt);

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    // await emailService.sendMail(
    //   email,
    //   'Looper Password Reset Request',
    //   `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${resetLink}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`,
    //   `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>\n<p>Please click on the following link, or <a href="${resetLink}">paste this into your browser</a> to complete the process:</p>\n<p><a href="${resetLink}">${resetLink}</a></p>\n<p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`
    // );
  }

  async resetPassword(token: string, newPasswordPlain: string): Promise<void> {
    const resetToken = await storage.getPasswordResetToken(token);

    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new Error("Invalid or expired token");
    }

    const user = await storage.getUserByEmail(resetToken.email);
    if (!user) {
      throw new Error("User not found");
    }

    const hashedPassword = await bcrypt.hash(newPasswordPlain, 10);
    await storage.updateUser(user.id, { password: hashedPassword });
    await storage.deletePasswordResetToken(token);
  }
}

export const passwordResetService = new PasswordResetService();