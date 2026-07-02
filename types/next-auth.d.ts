import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "ADMIN" | "AGENT";
    licensedStates: string[];
  }

  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "AGENT";
      licensedStates: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "AGENT";
    licensedStates: string[];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "AGENT";
    licensedStates: string[];
  }
}
