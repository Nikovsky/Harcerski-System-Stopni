import { Module } from '@nestjs/common';
import { TrialsService } from './trials.service';

@Module({
  providers: [TrialsService]
})
export class TrialsModule {}
