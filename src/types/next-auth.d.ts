import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      organizationId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    tokenVersion: number;
    organizationId: string;
    isActive: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: string;
    tokenVersion?: number;
    organizationId?: string;
  }
}
