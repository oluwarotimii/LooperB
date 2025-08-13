import { OAuth2Client } from 'google-auth-library';
import { storage } from '../storage';
import { generateTokens } from '../middleware/auth';
import bcrypt from 'bcrypt';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export const getGoogleAuthURL = () => {
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
  return authUrl;
};

export const getGoogleUserInfo = async (code: string): Promise<GoogleUserInfo> => {
  const { tokens } = await client.getAccessToken(code);
  client.setCredentials(tokens);

  const response = await client.request({
    url: 'https://www.googleapis.com/oauth2/v2/userinfo',
  });

  const userInfo = response.data as any;
  return {
    id: userInfo.id,
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
  };
};

export const authenticateWithGoogle = async (code: string) => {
  try {
    const googleUser = await getGoogleUserInfo(code);
    
    // Check if user exists in database
    let user = await storage.getUserByEmail(googleUser.email);
    
    if (!user) {
      // Create new user
      const hashedPassword = await bcrypt.hash('google-oauth-' + googleUser.id, 10);
      user = await storage.createUser({
        email: googleUser.email,
        password: hashedPassword,
        fullName: googleUser.name,
        role: 'consumer',
        isVerified: true, // Google accounts are considered verified
      });
    }

    // Generate JWT tokens
    const tokens = generateTokens(user.id);
    
    // Update refresh token in database
    await storage.updateUser(user.id, { 
      refreshToken: tokens.refreshToken,
      lastActiveAt: new Date()
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens,
    };
  } catch (error) {
    throw new Error('Google authentication failed: ' + (error as Error).message);
  }
};