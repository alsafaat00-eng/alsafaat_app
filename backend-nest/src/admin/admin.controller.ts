import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { Public, RateLimit, Roles } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/utils/response.util';
import type { JwtPayload } from '../common/types/jwt-payload.interface';
import type {
  ApproveApplicationBodyDto,
  CommentApplicationBodyDto,
  RejectApplicationBodyDto,
} from './dto/admin.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Roles('ADMIN')
  @RateLimit('api')
  @Get('butcher-applications')
  @HttpCode(HttpStatus.OK)
  async listButcherApplications(@Query() query: Record<string, unknown>) {
    return successResponse(await this.admin.listButcherApplications(query));
  }

  @Roles('ADMIN')
  @RateLimit('api')
  @Get('butcher-applications/:id')
  @HttpCode(HttpStatus.OK)
  async getButcherApplication(@Param('id') id: string) {
    return successResponse(await this.admin.getButcherApplication(id));
  }

  @Roles('ADMIN')
  @RateLimit('api')
  @Post('butcher-applications/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveApplication(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: ApproveApplicationBodyDto,
  ) {
    return successResponse(
      await this.admin.approveButcherApplication(user, id, body),
    );
  }

  @Roles('ADMIN')
  @RateLimit('api')
  @Post('butcher-applications/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectApplication(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: RejectApplicationBodyDto,
  ) {
    return successResponse(
      await this.admin.rejectButcherApplication(user, id, body),
    );
  }

  @Roles('ADMIN')
  @RateLimit('api')
  @Post('butcher-applications/:id/comment')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: CommentApplicationBodyDto,
  ) {
    return successResponse(
      await this.admin.addButcherApplicationComment(user, id, body),
    );
  }

  @Public()
  @RateLimit('api')
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanup(
    @Req() req: Request,
    @Headers('x-cron-secret') cronSecret?: string,
  ) {
    return successResponse(
      await this.admin.runCleanupAuthorized(
        cronSecret,
        req.headers.authorization,
      ),
    );
  }
}
