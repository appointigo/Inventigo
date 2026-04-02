import { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: Role;
    storeId: string | null;
    orgId: string | null;
    orgName?: string | null;
    emailVerified?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      role: Role;
      storeId: string | null;
      orgId: string | null;
      orgName: string | null;
      emailVerified: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    storeId: string | null;
    orgId: string | null;
    orgName?: string | null;
    emailVerified?: boolean;
  }
}
