import { db } from "@zenith-hr/db";
import * as schema from "@zenith-hr/db/schema/auth";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { env } from "./env";

// Re-export password utilities for use in other packages
export { hashPassword, verifyPassword } from "better-auth/crypto";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: env.CORS_ORIGIN ? [env.CORS_ORIGIN] : [],
  plugins: [admin()],
  user: {
    additionalFields: {
      sapNo: {
        type: "string",
        required: true,
        unique: true,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "REQUESTER",
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: { email: string };
      url: string;
    }) => {
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
    ...(env.BETTER_AUTH_COOKIE_DOMAIN
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: env.BETTER_AUTH_COOKIE_DOMAIN,
          },
        }
      : {}),
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
} satisfies BetterAuthOptions);
