import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    sessionVersion?: number;
    role: string;
    roles?: string[];
    organizationId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      sessionVersion: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    roles?: string[];
    organizationId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    sessionVersion?: number;
    role?: string;
    roles?: string[];
    organizationId?: string | null;
  }
}
