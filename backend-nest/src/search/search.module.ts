import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService, SearchRepository } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchRepository],
})
export class SearchModule {}
