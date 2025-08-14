import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
  private fromEmail = 'onboarding@resend.dev'; // Using Resend's verified domain for testing

  async sendWelcomeEmail(to: string, fullName: string): Promise<void> {
    try {
      await resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Welcome to Looper - Start Reducing Food Waste!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2D5016;">Welcome to Looper, ${fullName}!</h1>
            <p>Thank you for joining our mission to reduce food waste and create a sustainable future.</p>
            <p>With Looper, you can:</p>
            <ul>
              <li>Discover discounted food from local businesses</li>
              <li>Save money while helping the environment</li>
              <li>Track your positive impact</li>
            </ul>
            <p><a href="${process.env.FRONTEND_URL}" style="background-color: #2D5016; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Start Exploring</a></p>
            <p>Happy food rescuing!<br>The Looper Team</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw new Error('Email service unavailable');
    }
  }

  async sendBusinessRegistrationEmail(to: string, fullName: string, businessName: string): Promise<void> {
    try {
      await resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Business Registration Received - Looper',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2D5016;">Business Registration Received!</h1>
            <p>Hello ${fullName},</p>
            <p>Thank you for registering your business "${businessName}" with Looper!</p>
            <p>Your business registration is now under review. You'll receive another email within 24-48 hours with the verification status.</p>
            <p>While you wait, you can:</p>
            <ul>
              <li>Complete your business profile</li>
              <li>Upload your business logo</li>
              <li>Set up your opening hours</li>
            </ul>
            <p><a href="${process.env.FRONTEND_URL}/business/dashboard" style="background-color: #2D5016; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Business Dashboard</a></p>
            <p>Welcome to the food waste reduction movement!<br>The Looper Team</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Failed to send business registration email:', error);
      throw new Error('Email service unavailable');
    }
  }

  async sendBusinessVerificationEmail(to: string, businessName: string, approved: boolean, reason?: string): Promise<void> {
    try {
      const subject = approved ? 'Business Verified - Start Listing on Looper!' : 'Business Verification Update';
      const html = approved ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2D5016;">Congratulations! ${businessName} is now verified</h1>
          <p>Your business has been successfully verified on Looper.</p>
          <p>You can now:</p>
          <ul>
            <li>Create food listings</li>
            <li>Manage orders</li>
            <li>Track your impact</li>
            <li>Invite staff members</li>
          </ul>
          <p><a href="${process.env.FRONTEND_URL}/business/dashboard" style="background-color: #2D5016; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a></p>
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #d32f2f;">Business Verification Update</h1>
          <p>We've reviewed your business application for ${businessName}.</p>
          <p>Unfortunately, we need additional information before we can verify your business.</p>
          <p><strong>Reason:</strong> ${reason || 'Please contact support for more details.'}</p>
          <p>Please update your business information and resubmit for verification.</p>
          <p><a href="${process.env.FRONTEND_URL}/business/profile">Update Business Info</a></p>
        </div>
      `;

      await resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html
      });
    } catch (error) {
      console.error('Failed to send business verification email:', error);
      throw new Error('Email service unavailable');
    }
  }

  async sendOrderConfirmationEmail(to: string, orderDetails: any): Promise<void> {
    try {
      await resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Order Confirmed - Pickup Code: ${orderDetails.pickupCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2D5016;">Order Confirmed!</h1>
            <p>Your order from ${orderDetails.businessName} has been confirmed.</p>
            
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h2>Pickup Details</h2>
              <p><strong>Pickup Code:</strong> <span style="font-size: 24px; font-weight: bold; color: #2D5016;">${orderDetails.pickupCode}</span></p>
              <p><strong>Business:</strong> ${orderDetails.businessName}</p>
              <p><strong>Address:</strong> ${orderDetails.businessAddress}</p>
              <p><strong>Pickup Window:</strong> ${orderDetails.pickupWindow}</p>
            </div>

            <div style="background: #e8f5e8; padding: 15px; border-radius: 8px;">
              <p><strong>Total Amount:</strong> ₦${orderDetails.totalAmount}</p>
              <p><strong>Items:</strong> ${orderDetails.itemCount} item(s)</p>
            </div>

            <p><strong>Important:</strong> Please show this pickup code at the business to collect your order.</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Failed to send order confirmation email:', error);
      throw new Error('Email service unavailable');
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      await resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Reset Your Looper Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Reset Your Password</h1>
            <p>We received a request to reset your password for your Looper account.</p>
            <p>Click the button below to reset your password:</p>
            <p><a href="${resetUrl}" style="background-color: #2D5016; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this reset, you can safely ignore this email.</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Email service unavailable');
    }
  }

  async sendStaffInvitationEmail(to: string, businessName: string, role: string, invitationToken: string): Promise<void> {
    try {
      const invitationUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;
      
      await resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Invitation to join ${businessName} on Looper`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>You're Invited!</h1>
            <p>You have been invited to join <strong>${businessName}</strong> as a <strong>${role}</strong> on Looper.</p>
            <p>Looper is a platform that helps businesses reduce food waste by connecting them with customers who want to buy surplus food at discounted prices.</p>
            <p><a href="${invitationUrl}" style="background-color: #2D5016; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
            <p>This invitation will expire in 7 days.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Failed to send staff invitation email:', error);
      throw new Error('Email service unavailable');
    }
  }

  async sendBusinessRegistrationEmail(to: string, ownerName: string, businessName: string): Promise<void> {
    try {
      await resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Business Registration Successful - Looper',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2D5016;">Business Registration Successful!</h1>
            <p>Hi ${ownerName},</p>
            <p>Thank you for registering your business "${businessName}" with Looper!</p>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What's Next?</h3>
              <ul>
                <li>Your business is now pending verification</li>
                <li>Our team will review your business within 24-48 hours</li>
                <li>Once verified, you can start listing surplus food items</li>
                <li>You'll be notified via email once verification is complete</li>
              </ul>
            </div>
            <p>During the verification process, you can:</p>
            <ul>
              <li>Complete your business profile</li>
              <li>Upload business photos</li>
              <li>Set up your operating hours</li>
              <li>Invite staff members</li>
            </ul>
            <p><a href="${process.env.FRONTEND_URL}/business/dashboard" style="background-color: #2D5016; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Business Dashboard</a></p>
            <p>Welcome to the food waste reduction movement!<br>The Looper Team</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Failed to send business registration email:', error);
      throw new Error('Email service unavailable');
    }
  }
}

export const emailService = new EmailService();