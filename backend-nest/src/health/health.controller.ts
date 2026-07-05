import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../common/decorators/auth.decorators';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  @HttpCode(200)
  async get(@Res({ passthrough: true }) res: Response) {
    const result = await this.health.check();
    res.status(result.httpStatus);
    const { httpStatus: _, ...body } = result;
    return body;
  }
}
