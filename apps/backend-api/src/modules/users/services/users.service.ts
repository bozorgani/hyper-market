import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { UserRole, DEPRECATED_ROLES } from '../enums/user-role.enum';
import { UsersRepository, UserListResult, UserWithId } from '../repositories/users.repository';
import { User } from '../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(data: Partial<User>): Promise<User> {
    this.ensureRoleIsAssignable(data.role as UserRole | undefined);
    return this.usersRepository.create(data);
  }

  async getUserById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async getUserByIdOrFail(id: string): Promise<User> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user id');
    }

    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async listUsers(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async listUsersPaginated(
    page: number,
    limit: number,
    role?: string,
    accountStatus?: string,
    search?: string,
  ): Promise<UserListResult> {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return this.usersRepository.findAllPaginated(safePage, safeLimit, role, accountStatus, search?.trim());
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async getUserByEmailWithPassword(email: string): Promise<UserWithId | null> {
    return this.usersRepository.findByEmailWithPassword(email);
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findByPhone(phone);
  }

  async getUserByPhoneWithPassword(phone: string): Promise<UserWithId | null> {
    return this.usersRepository.findByPhoneWithPassword(phone);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    if (data.role) {
      this.ensureRoleIsAssignable(data.role as UserRole);
    }
    return this.usersRepository.updateById(id, data);
  }

  async verifyEmail(id: string): Promise<User | null> {
    return this.usersRepository.verifyEmail(id);
  }

  async verifyPhone(id: string): Promise<User | null> {
    return this.usersRepository.verifyPhone(id);
  }

  async updatePasswordAndIncrementTokenVersion(
    id: string,
    passwordHash: string,
  ): Promise<User | null> {
    return this.usersRepository.updatePasswordAndIncrementTokenVersion(
      id,
      passwordHash,
    );
  }

  async incrementTokenVersion(id: string): Promise<User | null> {
    return this.usersRepository.incrementTokenVersion(id);
  }

  async incrementFailedLoginAttempts(id: string): Promise<User | null> {
    return this.usersRepository.incrementFailedLoginAttempts(id);
  }

  async lockAccount(id: string, lockedUntil: Date): Promise<User | null> {
    return this.usersRepository.lockAccount(id, lockedUntil);
  }

  async resetLoginSecurity(id: string): Promise<User | null> {
    return this.usersRepository.resetLoginSecurity(id);
  }

  async softDeleteUser(id: string): Promise<User | null> {
    return this.usersRepository.softDelete(id);
  }

  async blockUser(id: string, actorUserId?: string): Promise<User> {
    const targetUser = await this.getUserByIdOrFail(id);

    if (actorUserId && actorUserId === id) {
      throw new BadRequestException('You cannot block your own account');
    }

    if (targetUser.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin accounts cannot be blocked');
    }

    const user = await this.usersRepository.blockUser(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async unblockUser(id: string): Promise<User> {
    await this.getUserByIdOrFail(id);

    const user = await this.usersRepository.unblockUser(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async emailExists(email: string): Promise<boolean> {
    return this.usersRepository.existsByEmail(email);
  }

  async phoneExists(phone: string): Promise<boolean> {
    return this.usersRepository.existsByPhone(phone);
  }

  /**
   * Prevent assignment of deprecated roles (VENDOR, DELIVERY) to users.
   * These roles are retained in the enum for DB backward compatibility
   * but must not be assigned to new or updated users.
   */
  private ensureRoleIsAssignable(role: UserRole | undefined): void {
    if (role && DEPRECATED_ROLES.includes(role)) {
      throw new BadRequestException(
        `Role "${role}" is deprecated and cannot be assigned. ` +
        'Allowed roles: super_admin, admin, customer',
      );
    }
  }
}
