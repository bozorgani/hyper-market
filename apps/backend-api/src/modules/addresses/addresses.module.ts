import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AddressController } from './controllers/address.controller';
import { AddressRepository } from './repositories/address.repository';
import { Address, AddressSchema } from './schemas/address.schema';
import { AddressService } from './services/address.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Address.name, schema: AddressSchema }])],
  controllers: [AddressController],
  providers: [AddressRepository, AddressService],
  exports: [AddressRepository, AddressService],
})
export class AddressesModule {}
