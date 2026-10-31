import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./lib/prisma"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account, profile }) {
      // On initial sign-in, `user` is available from the adapter
      if (user) {
        token.sub = user.id;
        token.subVerified = false;
      }

      // If we have an email but sub doesn't match a DB user, resolve the correct ID
      // This handles cases where the JWT sub gets out of sync with the database.
      // Checked once per token rather than on every auth() call.
      if (token.email && token.sub && !token.subVerified) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        });
        if (dbUser && dbUser.id !== token.sub) {
          console.log(`[AUTH] Correcting JWT sub: ${token.sub} -> ${dbUser.id}`);
          token.sub = dbUser.id;
        }
        token.subVerified = true;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
})
