import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnboarding = nextUrl.pathname.startsWith('/onboarding');

      // Signed-in users never need the login page; route them to their home
      if (isLoggedIn && nextUrl.pathname === '/login') {
        const target = new URL('/auth/continue', nextUrl);
        // Keep a sign-up choice (e.g. "Wedding Pro") so it still applies to a fresh account
        const role = nextUrl.searchParams.get('role');
        if (role === 'couple' || role === 'planner') target.searchParams.set('role', role);
        return Response.redirect(target);
      }

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isOnboarding) {
        if (isLoggedIn) return true;
        return false;
      }
      
      return true;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub; // Ensure UUID is mapped correctly
      }
      return session;
    },
    jwt({ token, user, account, profile }) {
      if (user) {
        token.sub = user.id; // Map UUID to NextAuth's internal subject
      }
      return token;
    }
  },
  providers: [], // Add providers with an empty array for now
  session: { strategy: 'jwt' },
} satisfies NextAuthConfig;
