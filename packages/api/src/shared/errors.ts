import { ORPCError } from "@orpc/server";

export class AppError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = "AppError";
  }

  static notFound(message = "Resource not found") {
    return new AppError("NOT_FOUND", message, 404);
  }

  static unauthorized(message = "Unauthorized") {
    return new AppError("UNAUTHORIZED", message, 401);
  }

  static badRequest(message: string) {
    return new AppError("BAD_REQUEST", message, 400);
  }

  toORPCError() {
    return new ORPCError(this.code, { message: this.message });
  }
}
