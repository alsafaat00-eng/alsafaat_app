import { Controller, Get, HttpCode } from '@nestjs/common';
import { Public } from '../common/decorators/auth.decorators';
import { successResponse } from '../common/utils/response.util';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Public()
  @Get()
  @HttpCode(200)
  getPlans() {
    return successResponse(this.plans.getPlans());
  }
}
