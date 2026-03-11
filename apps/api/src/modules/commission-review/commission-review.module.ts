// @file: apps/api/src/modules/commission-review/commission-review.module.ts
import { Module } from '@nestjs/common';
import { CommissionReviewAuditService } from './commission-review-audit.service';
import { CommissionReviewController } from './commission-review.controller';
import { CommissionReviewService } from './commission-review.service';

@Module({
  controllers: [CommissionReviewController],
  providers: [CommissionReviewService, CommissionReviewAuditService],
})
export class CommissionReviewModule {}
