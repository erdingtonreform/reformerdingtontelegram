import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "telegram",
      credentials: {
        telegramId: { label: "Telegram ID", type: "text" },
        twoFactorToken: { label: "2FA Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.telegramId) return null;

        // In WebApp context, this would be populated from Telegram WebApp API
        // For now, basic check against admin IDs
        const adminIds = process.env.ADMIN_USER_IDS?.split(',') || [];
        const wardLeads = JSON.parse(process.env.WARD_LEADS || '{}');

        const userId = credentials.telegramId;
        const isAdmin = adminIds.includes(userId);
        const isWardLead = Object.values(wardLeads).some((leads: any) => (leads as string[]).includes(userId));

        if (!isAdmin && !isWardLead) return null;

        // Check 2FA if enabled for user
        if (process.env.TWO_FA_SECRETS) {
          const twoFactorSecrets = JSON.parse(process.env.TWO_FA_SECRETS || '{}');
          if (twoFactorSecrets[userId]) {
            if (!credentials.twoFactorToken) {
              throw new Error('2FA token required');
            }
            const verified = speakeasy.totp.verify({
              secret: twoFactorSecrets[userId],
              encoding: 'base32',
              token: credentials.twoFactorToken,
              window: 2, // Allow for clock skew
            });
            if (!verified) {
              throw new Error('Invalid 2FA token');
            }
          }
        }

        return {
          id: userId,
          name: `User ${userId}`,
          email: null,
          image: null,
          role: isAdmin ? 'admin' : 'ward_lead',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub!;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// 2FA utility functions
export async function generate2FASecret(userId: string): Promise<{ secret: string, qrCodeUrl: string }> {
  const secret = speakeasy.generateSecret({
    name: `Reformer Dington Telegram (${userId})`,
    issuer: 'Reformer Dington Telegram'
  });

  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

  return {
    secret: secret.base32,
    qrCodeUrl
  };
}

export async function verify2FAToken(secret: string, token: string): Promise<boolean> {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2,
  });
}