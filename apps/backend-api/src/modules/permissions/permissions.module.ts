import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionRepository } from './repositories/permission.repository';
import { Permission, PermissionSchema } from './schemas/permission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Permission.name, schema: PermissionSchema },
    ]),
  ],
  providers: [PermissionRepository, PermissionsGuard],
  exports: [PermissionRepository, PermissionsGuard],
})
export class PermissionsModule {}
