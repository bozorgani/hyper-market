import { MigrationRunner, Migration } from './migration-runner';

// Lightweight mock for Mongoose Connection
function createMockConnection() {
  const applied: Record<string, any>[] = [];

  return {
    collection: jest.fn().mockReturnValue({
      createIndex: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue(applied),
      }),
      insertOne: jest.fn().mockImplementation((doc: any) => {
        applied.push(doc);
      }),
    }),
    _applied: applied,
  };
}

describe('MigrationRunner', () => {
  let connection: ReturnType<typeof createMockConnection>;
  let runner: MigrationRunner;

  beforeEach(() => {
    connection = createMockConnection();
    runner = new MigrationRunner(connection as any);
  });

  it('should do nothing when migrations list is empty', async () => {
    await runner.run([]);
    expect(connection.collection).not.toHaveBeenCalled();
  });

  it('should run a new migration and record it', async () => {
    const migration: Migration = {
      id: '0001',
      description: 'Test migration',
      up: jest.fn().mockResolvedValue(undefined),
    };

    await runner.run([migration]);

    expect(migration.up).toHaveBeenCalledWith(connection);
    expect(connection.collection().insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ id: '0001', description: 'Test migration' }),
    );
  });

  it('should skip already-applied migrations', async () => {
    // Pre-populate as if '0001' was already applied
    (connection._applied as any[]).push({ id: '0001' });

    const migration: Migration = {
      id: '0001',
      description: 'Already applied',
      up: jest.fn().mockResolvedValue(undefined),
    };

    await runner.run([migration]);

    expect(migration.up).not.toHaveBeenCalled();
    expect(connection.collection().insertOne).not.toHaveBeenCalled();
  });

  it('should run migrations in order by id', async () => {
    const calls: string[] = [];

    const migration1: Migration = {
      id: '0001',
      description: 'First',
      up: jest.fn().mockImplementation(async () => { calls.push('0001'); }),
    };
    const migration2: Migration = {
      id: '0002',
      description: 'Second',
      up: jest.fn().mockImplementation(async () => { calls.push('0002'); }),
    };

    // Pass in reverse order
    await runner.run([migration2, migration1]);

    expect(calls).toEqual(['0001', '0002']);
  });

  it('should stop on first migration failure and throw', async () => {
    const migration1: Migration = {
      id: '0001',
      description: 'Will fail',
      up: jest.fn().mockRejectedValue(new Error('Migration failed')),
    };
    const migration2: Migration = {
      id: '0002',
      description: 'Should not run',
      up: jest.fn().mockResolvedValue(undefined),
    };

    await expect(runner.run([migration1, migration2])).rejects.toThrow('Migration failed');
    expect(migration2.up).not.toHaveBeenCalled();
  });

  it('should create unique index on migration id', async () => {
    const migration: Migration = {
      id: '0001',
      description: 'Index test',
      up: jest.fn().mockResolvedValue(undefined),
    };

    await runner.run([migration]);

    expect(connection.collection().createIndex).toHaveBeenCalledWith(
      { id: 1 },
      { unique: true },
    );
  });
});
