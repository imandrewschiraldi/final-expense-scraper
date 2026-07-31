import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.active || !user.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          licensedStates: user.licensedStates,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.licensedStates = user.licensedStates;
      } else if (trigger === "update" && token.id) {
        // Re-reads the DB instead of trusting the client-supplied update
        // payload, so this can only ever reflect what's actually stored —
        // used by the role-switch control to refresh the token without a
        // full logout/login.
        const fresh = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, licensedStates: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.licensedStates = fresh.licensedStates;
        }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.licensedStates = token.licensedStates;
      return session;
    },
  },
});
