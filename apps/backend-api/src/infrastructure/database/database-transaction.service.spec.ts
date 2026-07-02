import { DatabaseTransactionService } from './database-transaction.service';
import { LoggerService } from '../logger/logger.service';

const UNSUPPORTED_MESSAGE =
  'Transaction numbers are only allowed on a replica set member or mongos';

describe('DatabaseTransactionService (#6)', () => {
  let connection: {
    startSession: jest.Mock;
    collection: jest.Mock;
  };
  let session: {
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    abortTransaction: jest.Mock;
    endSession: jest.Mock;
  };
  let collection: { insertOne: jest.Mock; deleteMany: jest.Mock };
  let logger: {
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
  let service: DatabaseTransactionService;

  beforeEach(() => {
    session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    collection = {
      insertOne: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    };
    connection = {
      startSession: jest.fn().mockResolvedValue(session),
      collection: jest.fn().mockReturnValue(collection),
    };
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    service = new DatabaseTransactionService(connection as never, logger as unknown as LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.APP_ENV;
    delete process.env.MONGODB_TRANSACTION_FALLBACK_ENABLED;
  });

  describe('probeTransactionSupport', () => {
    it('reports supported when a real transaction round-trips', async () => {
      const ok = await service.probeTransactionSupport();
      expect(ok).toBe(true);
      expect(service.isTransactionSupported()).toBe(true);
      expect(session.commitTransaction).toHaveBeenCalled();
    });

    it('reports unsupported when the transaction fails', async () => {
      collection.insertOne.mockRejectedValue(new Error(UNSUPPORTED_MESSAGE));
      const ok = await service.probeTransactionSupport();
      expect(ok).toBe(false);
      expect(service.isTransactionSupported()).toBe(false);
      expect(session.abortTransaction).toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('logs info when transactions are supported', async () => {
      await service.onModuleInit();
      expect(logger.info).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs an error (non-prod) when transactions are unsupported', async () => {
      collection.insertOne.mockRejectedValue(new Error(UNSUPPORTED_MESSAGE));
      await service.onModuleInit();
      expect(logger.error).toHaveBeenCalled();
    });

    it('fails fast in production when transactions are unsupported', async () => {
      process.env.APP_ENV = 'production';
      collection.insertOne.mockRejectedValue(new Error(UNSUPPORTED_MESSAGE));
      await expect(service.onModuleInit()).rejects.toThrow(/FATAL/);
    });

    it('does NOT fail fast in production when fallback is explicitly enabled', async () => {
      process.env.APP_ENV = 'production';
      process.env.MONGODB_TRANSACTION_FALLBACK_ENABLED = 'true';
      collection.insertOne.mockRejectedValue(new Error(UNSUPPORTED_MESSAGE));
      await service.onModuleInit();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('executeInTransaction', () => {
    it('runs the callback once without a session when unsupported (no duplicate)', async () => {
      collection.insertOne.mockRejectedValue(new Error(UNSUPPORTED_MESSAGE));
      await service.probeTransactionSupport(); // sets supported=false

      const cb = jest.fn().mockResolvedValue('done');
      const result = await service.executeInTransaction(cb);

      expect(result).toBe('done');
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(undefined);
      // startSession must NOT be called again by executeInTransaction.
      expect(connection.startSession).toHaveBeenCalledTimes(1);
    });

    it('commits and returns the result when supported', async () => {
      const cb = jest.fn().mockResolvedValue('value');
      const result = await service.executeInTransaction(cb);

      expect(result).toBe('value');
      expect(session.startTransaction).toHaveBeenCalled();
      expect(session.commitTransaction).toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith(session);
    });

    it('falls back (single re-run) when the callback fails before completing', async () => {
      const error = new Error(UNSUPPORTED_MESSAGE);
      const cb = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('recovered');

      const result = await service.executeInTransaction(cb);

      expect(result).toBe('recovered');
      expect(cb).toHaveBeenCalledTimes(2); // original + one fallback
      expect(logger.warn).toHaveBeenCalled();
    });

    it('does NOT re-run when the callback completed but the commit failed', async () => {
      session.commitTransaction.mockRejectedValue(new Error('commit failed'));
      const cb = jest.fn().mockResolvedValue('value');

      await expect(service.executeInTransaction(cb)).rejects.toThrow(
        'commit failed',
      );
      // No duplicate execution.
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });
});
