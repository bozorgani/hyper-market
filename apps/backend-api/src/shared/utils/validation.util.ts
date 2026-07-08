import { BadRequestException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

/**
 * Validates that a string is a valid MongoDB ObjectId
 * @param id - The ID to validate
 * @param fieldName - Optional field name for error message
 * @throws BadRequestException if ID is invalid
 */
export function ensureValidObjectId(id: string, fieldName = 'ID'): void {
  if (!isValidObjectId(id)) {
    throw new BadRequestException(`Invalid ${fieldName}`);
  }
}

/**
 * Validates that a value is a positive integer
 * @param value - The value to validate
 * @param fieldName - Optional field name for error message
 * @param min - Optional minimum value (default: 1)
 * @returns The validated positive integer
 * @throws BadRequestException if value is invalid
 */
export function ensurePositiveInteger(
  value: any,
  fieldName = 'value',
  min = 1,
): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num < min) {
    throw new BadRequestException(
      `${fieldName} must be an integer greater than or equal to ${min}`,
    );
  }
  return num;
}

/**
 * Validates that a string is not empty after trimming
 * @param value - The string to validate
 * @param fieldName - Field name for error message
 * @returns The trimmed string
 * @throws BadRequestException if string is empty
 */
export function ensureNonEmptyString(value: any, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`${fieldName} is required`);
  }
  return value.trim();
}

/**
 * Validates that a number is non-negative
 * @param value - The number to validate
 * @param fieldName - Field name for error message
 * @returns The validated number
 * @throws BadRequestException if value is negative
 */
export function ensureNonNegative(value: any, fieldName: string): number {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new BadRequestException(`${fieldName} must be a non-negative number`);
  }
  return num;
}

/**
 * Validates that a date string is valid and optionally in the future
 * @param dateStr - The date string to validate
 * @param fieldName - Field name for error message
 * @param mustBeFuture - Whether the date must be in the future
 * @returns The validated Date object
 * @throws BadRequestException if date is invalid
 */
export function ensureValidDate(
  dateStr: any,
  fieldName: string,
  mustBeFuture = false,
): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid ${fieldName}`);
  }
  if (mustBeFuture && date <= new Date()) {
    throw new BadRequestException(`${fieldName} must be in the future`);
  }
  return date;
}

/**
 * Validates that a value is one of the allowed values
 * @param value - The value to validate
 * @param allowed - Array of allowed values
 * @param fieldName - Field name for error message
 * @returns The validated value
 * @throws BadRequestException if value is not allowed
 */
export function ensureEnum<T>(value: any, allowed: T[], fieldName: string): T {
  if (!allowed.includes(value)) {
    throw new BadRequestException(
      `${fieldName} must be one of: ${allowed.join(', ')}`,
    );
  }
  return value;
}

/**
 * Validates pagination parameters
 * @param page - Page number
 * @param limit - Items per page
 * @param maxLimit - Maximum allowed limit
 * @returns Validated pagination parameters
 */
export function ensurePagination(
  page: any,
  limit: any,
  maxLimit = 100,
): { page: number; limit: number; skip: number } {
  const validatedPage = ensurePositiveInteger(page || 1, 'page');
  const validatedLimit = ensurePositiveInteger(limit || 20, 'limit');
  
  if (validatedLimit > maxLimit) {
    throw new BadRequestException(`limit must not exceed ${maxLimit}`);
  }
  
  return {
    page: validatedPage,
    limit: validatedLimit,
    skip: (validatedPage - 1) * validatedLimit,
  };
}
