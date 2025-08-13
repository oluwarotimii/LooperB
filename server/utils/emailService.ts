import sgMail from '@sendgrid/mail';

// sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const emailService = {
  async sendMail(to: string, subject: string, text: string, html?: string) {
    const msg = {
      to,
      from: process.env.SENDER_EMAIL!,
      subject,
      text,
      html,
    };

    try {
      await sgMail.send(msg);
      console.log(`Email sent to ${to}`);
    } catch (error: any) {
      console.error(`Error sending email to ${to}:`, error);
      if (error.response) {
        console.error(error.response.body)
      }
      // In a real app, you might log this error to a monitoring system
    }
  },
};