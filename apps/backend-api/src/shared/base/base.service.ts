import { Logger } from '@nestjs/common';
import { Model, Document, ClientSession } from 'mongoose';
import { ensureValidObjectId } from '../utils/validation.util';

/**
 * Base service class providing common CRUD operations and utilities.
 * Extend this class to reduce code duplication across services.
 * 
 * @template T - The Mongoose document type
 */
export abstract class BaseService<T extends Document> {
  protected readonly logger: Logger;

  constructor(
    protected readonly model: Model<T>,
    protected readonly modelName: string,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Find a document by ID
   * @param id - The document ID
   * @param session - Optional MongoDB session for transactions
   * @returns The found document or null
   */
  async findById(id: string, session?: ClientSession): Promise<T | null> {
    ensureValidObjectId(id, `${this.modelName} ID`);
    return this.model.findById(id).session(session || null).exec();
  }

  /**
   * Find a document by ID and throw if not found
   * @param id - The document ID
   * @param session - Optional MongoDB session for transactions
   * @returns The found document
   * @throws NotFoundException if document not found
   */
  async findByIdOrThrow(id: string, session?: ClientSession): Promise<T> {
    const doc = await this.findById(id, session);
    if (!doc) {
      throw new Error(`${this.modelName} not found`);
    }
    return doc;
  }

  /**
   * Create a new document
   * @param data - The document data
   * @param session - Optional MongoDB session for transactions
   * @returns The created document
   */
  async create(data: Partial<T>, session?: ClientSession): Promise<T> {
    const doc = new this.model(data);
    if (session) {
      await doc.save({ session });
    } else {
      await doc.save();
    }
    return doc;
  }

  /**
   * Update a document by ID
   * @param id - The document ID
   * @param update - The update data
   * @param session - Optional MongoDB session for transactions
   * @returns The updated document or null
   */
  async updateById(
    id: string,
    update: Partial<T>,
    session?: ClientSession,
  ): Promise<T | null> {
    ensureValidObjectId(id, `${this.modelName} ID`);
    return this.model
      .findByIdAndUpdate(id, update, { new: true, session })
      .exec();
  }

  /**
   * Delete a document by ID
   * @param id - The document ID
   * @param session - Optional MongoDB session for transactions
   * @returns The deleted document or null
   */
  async deleteById(id: string, session?: ClientSession): Promise<T | null> {
    ensureValidObjectId(id, `${this.modelName} ID`);
    return this.model.findByIdAndDelete(id, { session }).exec();
  }

  /**
   * Soft delete a document by setting deletedAt
   * @param id - The document ID
   * @param session - Optional MongoDB session for transactions
   * @returns The updated document or null
   */
  async softDelete(id: string, session?: ClientSession): Promise<T | null> {
    ensureValidObjectId(id, `${this.modelName} ID`);
    return this.model
      .findByIdAndUpdate(
        id,
        { deletedAt: new Date() } as any,
        { new: true, session },
      )
      .exec();
  }

  /**
   * Find documents with pagination
   * @param filter - The query filter
   * @param skip - Number of documents to skip
   * @param limit - Maximum number of documents to return
   * @param session - Optional MongoDB session for transactions
   * @returns Array of documents
   */
  async findWithPagination(
    filter: any,
    skip: number,
    limit: number,
    session?: ClientSession,
  ): Promise<T[]> {
    return this.model
      .find(filter)
      .skip(skip)
      .limit(limit)
      .session(session || null)
      .exec();
  }

  /**
   * Count documents matching a filter
   * @param filter - The query filter
   * @param session - Optional MongoDB session for transactions
   * @returns The count
   */
  async count(filter: any, session?: ClientSession): Promise<number> {
    return this.model.countDocuments(filter).session(session || null).exec();
  }

  /**
   * Check if a document exists
   * @param filter - The query filter
   * @param session - Optional MongoDB session for transactions
   * @returns True if document exists
   */
  async exists(filter: any, session?: ClientSession): Promise<boolean> {
    const count = await this.count(filter, session);
    return count > 0;
  }

  /**
   * Log an info message
   * @param message - The message to log
   * @param context - Optional context object
   */
  protected logInfo(message: string, context?: any): void {
    this.logger.log(message, context);
  }

  /**
   * Log a warning message
   * @param message - The message to log
   * @param context - Optional context object
   */
  protected logWarn(message: string, context?: any): void {
    this.logger.warn(message, context);
  }

  /**
   * Log an error message
   * @param message - The message to log
   * @param error - Optional error object
   */
  protected logError(message: string, error?: any): void {
    this.logger.error(message, error?.stack || error);
  }
}
