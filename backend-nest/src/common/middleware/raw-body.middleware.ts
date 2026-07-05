import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.method !== 'POST') return next();

    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      (req as Request & { rawBody?: string }).rawBody = data;
      try {
        req.body = data ? JSON.parse(data) : {};
      } catch {
        req.body = data;
      }
      next();
    });
    req.on('error', next);
  }
}
