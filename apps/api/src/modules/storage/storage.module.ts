// @file: apps/api/src/modules/storage/storage.module.ts
import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageCleanupService } from './storage-cleanup.service';

@Global()
@Module({
  providers: [StorageService, StorageCleanupService],
  exports: [StorageService],
})
export class StorageModule {}
