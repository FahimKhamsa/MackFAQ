import { Module } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { HttpModule } from '@nestjs/axios';
import { SOPService } from './sop.service';
import { SOPController } from './sop.controller';
import { SOPDocument } from './entities/sop-document.model';

@Module({
  imports: [HttpModule],
  controllers: [SOPController],
  providers: [
    SOPService,
    { provide: getModelToken(SOPDocument), useValue: SOPDocument },
  ],
  exports: [SOPService],
})
export class SOPModule {}
