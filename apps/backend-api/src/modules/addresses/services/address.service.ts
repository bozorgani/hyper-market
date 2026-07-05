import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateAddressDto, UpdateAddressDto } from '../dto/address.dto';
import { AddressRepository } from '../repositories/address.repository';
import { Address } from '../schemas/address.schema';

@Injectable()
export class AddressService {
  constructor(private readonly repository: AddressRepository) {}

  list(userId: string): Promise<Address[]> {
    return this.repository.findByUserId(userId);
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    const existingCount = await this.repository.countByUser(userId);
    const shouldBeDefault = dto.isDefault === true || existingCount === 0;
    if (shouldBeDefault) {
      await this.repository.unsetDefault(userId);
    }

    return this.repository.create({
      ...this.normalize(dto),
      userId: new Types.ObjectId(userId),
      isDefault: shouldBeDefault,
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto): Promise<Address> {
    const existing = await this.repository.findByIdForUser(id, userId);
    if (!existing) throw new NotFoundException('Address not found');

    if (dto.isDefault === true) {
      await this.repository.unsetDefault(userId);
    }

    const updated = await this.repository.updateByIdForUser(id, userId, {
      ...this.normalize(dto),
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
    });
    if (!updated) throw new NotFoundException('Address not found');
    return updated;
  }

  async remove(userId: string, id: string): Promise<{ success: true }> {
    const deleted = await this.repository.softDelete(id, userId);
    if (!deleted) throw new NotFoundException('Address not found');
    return { success: true };
  }

  async setDefault(userId: string, id: string): Promise<Address> {
    const existing = await this.repository.findByIdForUser(id, userId);
    if (!existing) throw new NotFoundException('Address not found');

    await this.repository.unsetDefault(userId);
    const updated = await this.repository.updateByIdForUser(id, userId, { isDefault: true });
    if (!updated) throw new BadRequestException('Unable to set default address');
    return updated;
  }

  private normalize(dto: CreateAddressDto | UpdateAddressDto): Partial<Address> {
    return {
      label: dto.label?.trim() || null,
      recipientName: dto.recipientName.trim(),
      phoneNumber: dto.phoneNumber.trim(),
      province: dto.province.trim(),
      city: dto.city.trim(),
      addressLine: dto.addressLine.trim(),
      plate: dto.plate?.trim() || null,
      unit: dto.unit?.trim() || null,
      postalCode: dto.postalCode?.trim() || null,
    };
  }
}
