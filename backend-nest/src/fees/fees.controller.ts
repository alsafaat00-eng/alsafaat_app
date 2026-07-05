import { Controller, Get, HttpCode } from '@nestjs/common';
import { Public } from '../common/decorators/auth.decorators';
import { successResponse } from '../common/utils/response.util';
import { FeesService } from './fees.service';

@Controller('fees')
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Public()
  @Get('rules')
  @HttpCode(200)
  getRules() {
    return successResponse(this.fees.getRules());
  }
}
