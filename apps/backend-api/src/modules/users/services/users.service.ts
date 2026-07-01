import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { UserRole } from '../enums/user-role.enum';
import { UsersRepository, UserWithId } from '../repositories/users.repository';
import { User } from '../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(data: Partial<User>): Promise<User> {
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
}
