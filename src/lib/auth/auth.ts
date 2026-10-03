import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import argon2 from "argon2";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation/schemas/auth";
import { provisionOrganizationAndOwner } from "@/lib/services/organizations";
import { writeAuditEvent } from "@/lib/audit/auditLog";

const prismaAdapter = PrismaAdapter(db);

// PrismaAdapter's default createUser only knows about the Auth.js-standard
// User columns (email/name/image/emailVerified) — it has no way to fill our
// app-specific required columns (organizationId, role). Overriding just this
// one method lets a brand-new Google sign-in provision a full Organization +
// OWNER user (same starter templates as /signup) atomically, so the rest of
// the adapter (account linking, session/token lookups) stays untouched.
const adapter: Adapter = {
  ...prismaAdapter,
  async createUser(data) {
    const { user } = await provisionOrganizationAndOwner({
      organizationName: `${data.name ?? data.email}'s Organization`,
      email: data.email,
      name: data.name ?? data.email,
    });
    return { ...user, email: user.email, emailVerified: data.emailVerified ?? null };
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
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
        // No passwordHash means this account was created via an OAuth
        // provider (e.g. Google) and has never set a password.
        if (!user || !user.isActive || !user.passwordHash) return null;

        const valid = await argon2.verify(user.passwordHash, password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tokenVersion: user.tokenVersion,
          organizationId: user.organizationId,
          isActive: user.isActive,
        };
      },
    }),
    Google({
      // Google verifies the email on its end, so a sign-in using an email
      // that already has a credentials-created account is trusted to be the
      // same person and gets linked to that existing account rather than
      // rejected with OAuthAccountNotLinked.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Blocks both providers: a deactivated user can't start a new session
      // even though the jwt callback below would also catch it on refresh.
      if (user.isActive === false) return false;
      return true;
    },
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
