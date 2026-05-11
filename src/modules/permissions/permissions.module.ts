import { Global, Module } from '@nestjs/common';
import { PermissionResolverService } from './permission-resolver.service';
import { PermissionsController } from './permissions.controller';

@Global()
@Module({
  controllers: [PermissionsController],
  providers: [PermissionResolverService],
  exports: [PermissionResolverService],
})
export class PermissionsModule {}
