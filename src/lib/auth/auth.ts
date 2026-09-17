import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import argon2 from "argon2";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation/schemas/auth";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Kept for future OAuth providers; not used for session persistence since
  // Credentials-only sign-in requires the JWT strategy (see schema.prisma
  // User.tokenVersion for how revocation is achieved instead).
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;

        const valid = await argon2.verify(user.passwordHash, password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tokenVersion: user.tokenVersion,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.tokenVersion = user.tokenVersion;
        token.organizationId = user.organizationId;
      }
      // Re-validate on every request: if the account was deactivated or its
      // tokenVersion was bumped (revocation), drop the claims so `session()`
      // below produces an empty session and the user is treated as signed out.
      if (token.uid) {
        const current = await db.user.findUnique({
          where: { id: token.uid as string },
          select: { isActive: true, tokenVersion: true, role: true, organizationId: true },
        });
        if (!current || !current.isActive || current.tokenVersion !== token.tokenVersion) {
          return {};
        }
        token.role = current.role;
        token.organizationId = current.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) {
        session.user.id = token.uid as string;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id || !user.organizationId) return;
      await writeAuditEvent({
        organizationId: user.organizationId,
        actorId: user.id,
        action: "user.signed_in",
        entityType: "User",
        entityId: user.id,
      });
    },
  },
});
