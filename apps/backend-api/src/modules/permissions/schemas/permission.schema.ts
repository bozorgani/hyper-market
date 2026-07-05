import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'permissions',
})
export class Permission {
  @Prop({ type: String, required: true, index: true })
  name!: string;

  @Prop({ type: String, required: true, index: true })
  resource!: string;

  @Prop({ type: String, required: true, index: true })
  action!: string;

  /**
   * The role this permission is granted to.
   * When present, this is a dynamic (DB-managed) permission assignment.
   * The combination (role + name) must be unique.
   */
  @Prop({ type: String, index: true })
  role?: string;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
PermissionSchema.index({ name: 1 });
PermissionSchema.index({ resource: 1, action: 1 });
// Ensure a role cannot have the same permission assigned twice.
// Permission definitions are intentionally assignment-oriented, so the same
// permission name/resource/action may be granted to multiple roles.
PermissionSchema.index({ role: 1, name: 1 }, { unique: true, sparse: true });
