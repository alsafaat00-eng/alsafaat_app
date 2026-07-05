import { Controller, Get, HttpCode } from '@nestjs/common';
import { Public } from '../common/decorators/auth.decorators';
import { successResponse } from '../common/utils/response.util';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Get('trending')
  @HttpCode(200)
  async trending() {
    return successResponse(await this.search.getTrending());
  }
}
