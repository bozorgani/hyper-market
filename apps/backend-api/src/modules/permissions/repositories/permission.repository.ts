import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from '../schemas/permission.schema';

@Injectable()
export class PermissionRepository {
  constructor(
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<PermissionDocument>,
  ) {}

  async create(data: Partial<Permission>): Promise<Permission> {
    const permission = new this.permissionModel(data);
    return permission.save();
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.permissionModel.findOne({ name }).lean().exec();
  }

  /**
   * Return all permissions assigned to a given role.
   */
  async findByRole(role: string): Promise<Permission[]> {
    return this.permissionModel.find({ role }).lean().exec();
  }

  /**
   * Return all role→permission mappings from the DB.
   */
  async findAll(): Promise<Permission[]> {
    return this.permissionModel.find().lean().exec();
  }

  /**
   * Return all distinct roles that have at least one DB-managed permission.
   */
  async findDistinctRoles(): Promise<string[]> {
    return this.permissionModel.distinct('role').exec();
  }

  /**
   * Delete a specific permission assignment for a role.
   */
  async deleteByRoleAndName(role: string, name: string): Promise<boolean> {
    const result = await this.permissionModel.deleteOne({ role, name }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Delete all permission assignments for a given role.
   */
  async deleteByRole(role: string): Promise<number> {
    const result = await this.permissionModel.deleteMany({ role }).exec();
    return result.deletedCount;
  }

  /**
   * Upsert a permission: create if not exists, update if it does.
   */
  async upsert(data: Partial<Permission>): Promise<Permission> {
    const filter = { role: data.role, name: data.name };
    return this.permissionModel
      .findOneAndUpdate(filter, data, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
      .lean()
      .exec() as Promise<Permission>;
  }
}
