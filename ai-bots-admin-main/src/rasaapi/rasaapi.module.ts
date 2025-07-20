import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RasaapiService } from './rasaapi.service';

@Module({
  imports: [HttpModule],
  providers: [RasaapiService],
  exports: [RasaapiService],
})
export class RasaapiModule {}
