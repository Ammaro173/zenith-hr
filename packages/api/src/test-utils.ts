import { afterEach } from "bun:test";
import type { Context } from "./context";

// Mock context for testing
export function createTestContext(overrides?: Partial<Context>): Context {
  return {
    session: null,
    request: new Request("http://localhost:3000/test"),
    // biome-ignore lint/suspicious/noExplicitAny: Mock DB for testing
    db: {} as any,
    storage: {
      upload: async () => "test-url",
      getPresignedUrl: async () => "test-presigned-url",
      // biome-ignore lint/suspicious/noExplicitAny: Mock storage service
    } as any,
    pdf: {
      generateContractPdf: async () => Buffer.from("test-pdf"),
      // biome-ignore lint/suspicious/noExplicitAny: Mock PDF service
    } as any,
    logger: {
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock logger intentionally does nothing
      info: () => {},
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock logger intentionally does nothing
      error: () => {},
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock logger intentionally does nothing
      warn: () => {},
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock logger intentionally does nothing
      debug: () => {},
      // biome-ignore lint/suspicious/noExplicitAny: Mock logger child
      child: () => ({}) as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock logger service
    } as any,
    requestId: "00000000-0000-0000-0000-000000000000",
    ...overrides,
  };
}

// Clean up after each test
afterEach(() => {
  // Add cleanup logic if needed
});
