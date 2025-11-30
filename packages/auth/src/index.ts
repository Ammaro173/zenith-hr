import { db } from "@zenith-hr/db";
// biome-ignore lint/performance/noNamespaceImport: biome is dumb
import * as schema from "@zenith-hr/db/schema/auth";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "./env";

export const auth = betterAuth<BetterAuthOptions>({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: env.CORS_ORIGIN ? [env.CORS_ORIGIN] : [],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO: Replace with actual email service in production
      // For development, log the reset URL to console
      console.log("=".repeat(60));
      console.log("PASSWORD RESET REQUEST");
      console.log("=".repeat(60));
      console.log(`User: ${user.email}`);
      console.log(`Reset URL: ${url}`);
      console.log("=".repeat(60));

      // In production, send email using your email service:
      // await emailService.send({
      //   to: user.email,
      //   subject: "Reset your password - Zenith HR",
      //   html: `
      //     <h1>Password Reset Request</h1>
      //     <p>Click the link below to reset your password:</p>
      //     <a href="${url}">Reset Password</a>
      //     <p>If you didn't request this, please ignore this email.</p>
      //   `,
      // });

      // Simulate async operation for development
      await Promise.resolve();
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
});
