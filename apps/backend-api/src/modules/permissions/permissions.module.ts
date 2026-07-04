import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionsController } from './controllers/permissions.controller';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionRepository } from './repositories/permission.repository';
import { PermissionsService } from './services/permissions.service';
import { Permission, PermissionSchema } from './schemas/permission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Permission.name, schema: PermissionSchema },
    ]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionRepository, PermissionsService, PermissionsGuard],
  exports: [PermissionRepository, PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
