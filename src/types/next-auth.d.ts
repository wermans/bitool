import { DefaultSession } from "next-auth";

export type UserAttributes = Record<string, string[]>;

export type ImpersonatedBy = {
  id: string;
  email: string;
  name: string | null;
} | null;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string | null;
      permissions: string[]; // formato "action:subject"
      isSuperAdmin: boolean;
      userAttributes: UserAttributes;
      impersonatedBy: ImpersonatedBy;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: string | null;
    isSuperAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: string | null;
    permissions: string[];
    isSuperAdmin: boolean;
    userAttributes: UserAttributes;
    impersonatedBy: ImpersonatedBy;
  }
}
