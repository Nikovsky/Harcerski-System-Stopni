import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trial } from './trial.entity';
import { TrialTask } from './trial-task.entity';
import { TrialTaskVerification } from './trial-task-verification.entity';
import { TrialsService } from './trials.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trial, TrialTask, TrialTaskVerification]),
  ],
  providers: [TrialsService]
})
export class TrialsModule {}
