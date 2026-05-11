import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { RetentionController } from './retention.controller';
import { RetentionService } from './retention.service';

@Global()
@Module({
  controllers: [AuditController, PrivacyController, RetentionController],
  providers: [AuditService, PrivacyService, RetentionService],
  exports: [AuditService, PrivacyService, RetentionService],
})
export class AuditModule {}
