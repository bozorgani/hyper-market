import { MongooseModuleAsyncOptions } from '@nestjs/mongoose';

export const databaseConfig: MongooseModuleAsyncOptions = {
  useFactory: () => ({
    uri: process.env.DATABASE_URL,
    retryAttempts: 5,
    retryDelay: 2000,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  }),
};
