import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * Turns every error into a response that says what actually went wrong.
 *
 * The tool is internal, so unexpected errors carry their type, message, Prisma
 * code/meta and the top of the stack instead of Nest's bare "Internal server
 * error" — enough to debug from the browser's network tab. HttpExceptions keep
 * their body and only gain request context. Every 5xx is logged with its stack.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const context = {
      method: req.method,
      path: req.originalUrl ?? req.url,
      timestamp: new Date().toISOString(),
      // Railway stamps every request; makes finding the log line trivial.
      requestId: req.headers['x-railway-request-id'] ?? undefined,
    };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'string'
          ? { statusCode: status, message: body }
          : (body as Record<string, unknown>);
      if (status >= 500) {
        this.logger.error(
          `${context.method} ${context.path} → ${status}: ${exception.message}`,
          exception.stack,
        );
      }
      res.status(status).json({ ...payload, ...context });
      return;
    }

    const err =
      exception instanceof Error ? exception : new Error(String(exception));
    const prisma =
      exception instanceof Prisma.PrismaClientKnownRequestError
        ? { prismaCode: exception.code, prismaMeta: exception.meta }
        : {};
    const status = prismaStatus(exception);

    this.logger.error(
      `${context.method} ${context.path} → ${status}: ${err.name}: ${err.message}`,
      err.stack,
    );

    res.status(status).json({
      statusCode: status,
      error: err.name,
      // Prisma messages come padded with blank lines.
      message: err.message.replace(/\s+/g, ' ').trim(),
      ...prisma,
      // Only the frames; the message is already above.
      stack: err.stack
        ?.split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('at '))
        .slice(0, 8),
      ...context,
    });
  }
}

/** Prisma's "not found" and "duplicate" are client problems, not crashes. */
function prismaStatus(exception: unknown): number {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2025') return HttpStatus.NOT_FOUND;
    if (exception.code === 'P2002') return HttpStatus.CONFLICT;
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}
