import { MongooseModuleAsyncOptions } from '@nestjs/mongoose';

export const databaseConfig: MongooseModuleAsyncOptions = {
  useFactory: () => ({
    uri: process.env.MONGO_URI,
  }),
};
