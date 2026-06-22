import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
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

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    return this.usersRepository.updateById(id, data);
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
