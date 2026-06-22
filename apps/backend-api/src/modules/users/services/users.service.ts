import { Injectable } from '@nestjs/common';
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

  async emailExists(email: string): Promise<boolean> {
    return this.usersRepository.existsByEmail(email);
  }

  async phoneExists(phone: string): Promise<boolean> {
    return this.usersRepository.existsByPhone(phone);
  }
}
