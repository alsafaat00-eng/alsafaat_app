import { Module } from '@nestjs/common';
import { ButchersController } from './butchers.controller';
import { ButchersService } from './butchers.service';
import { ButchersRepository } from './repositories/butchers.repository';

@Module({
  controllers: [ButchersController],
  providers: [ButchersService, ButchersRepository],
})
export class ButchersModule {}
