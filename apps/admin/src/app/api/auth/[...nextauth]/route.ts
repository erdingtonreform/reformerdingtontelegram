import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const authOptions = {
  providers: [
    CredentialsProvider({
      name: "telegram",
      credentials: {
        telegramId: { label: "Telegram ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.telegramId) return null;

        // In WebApp context, this would be populated from Telegram WebApp API
        // For now, basic check against admin IDs
        const adminIds = process.env.ADMIN_USER_IDS?.split(',') || [];
        const wardLeads = JSON.parse(process.env.WARD_LEADS || '{}');

        const userId = credentials.telegramId;
        const isAdmin = adminIds.includes(userId);
        const isWardLead = Object.values(wardLeads).some((leads: any) => leads.includes(userId));

        if (!isAdmin && !isWardLead) return null;

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
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };