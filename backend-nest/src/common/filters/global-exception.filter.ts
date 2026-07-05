import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiException } from '../exceptions/api.exception';
import { RateLimitException } from '../exceptions/rate-limit.exception';
import { isButcherApplicationError } from '../../butcher-applications/errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof ApiException) {
      return res.status(exception.status).json(exception.toJSON());
    }

    if (isButcherApplicationError(exception)) {
      return res.status(exception.httpStatus).json({
        success: false,
        error: exception.code,
        messageAr: exception.messageAr,
        ...(exception.details !== undefined
          ? { details: exception.details }
          : {}),
        timestamp: new Date().toISOString(),
      });
    }

    if (exception instanceof RateLimitException) {
      res.setHeader('Retry-After', String(exception.retryAfter));
      return res.status(429).json(exception.toJSON());
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'object' && payload !== null) {
        if ('success' in payload) {
          return res.status(status).json({
            ...payload,
            timestamp: new Date().toISOString(),
          });
        }
      }
      if (status === 405) {
        return res.status(405).end();
      }
    }

    return res.status(500).json({
      success: false,
      error: 'server_error',
      messageAr: 'خطأ في الخادم',
      timestamp: new Date().toISOString(),
    });
  }
}
