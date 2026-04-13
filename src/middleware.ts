import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

export default NextAuth(authConfig).auth

export const config = {
    matcher: [
        // Match all paths EXCEPT: static files, images, and auth API routes
        '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
