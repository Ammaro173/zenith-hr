import { describe, expect, test } from "bun:test";
import { ORPCError } from "@orpc/server";

describe("Production Readiness", () => {
  test("pino logger should be available", () => {
    const pino = require("pino");
    expect(pino).toBeDefined();
  });

  test("ORPCError should be throwable", () => {
    expect(() => {
      throw new ORPCError("UNAUTHORIZED");
    }).toThrow();
  });

  test("@t3-oss/env-core should be available", () => {
    const env = require("@t3-oss/env-core");
    expect(env.createEnv).toBeDefined();
  });
});

// Note: Environment validation runs on import and will fail if env vars are missing
// This is expected behavior - it ensures the app doesn't start with invalid config
