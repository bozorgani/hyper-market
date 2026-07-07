/**
 * Pagination utilities for safe parameter validation and parsing.
 * 
 * Prevents:
 * - Memory exhaustion from excessive page/limit values
 * - Denial of Service (DoS) attacks via large limit parameters
 * - Invalid pagination parameters
 */

/**
 * Pagination configuration constants
 */
export const PAGINATION_LIMITS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
  MIN_PAGE: 1,
} as const;

/**
 * Parsed pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Safely parses and validates pagination parameters from query strings.
 * 
 * @param page - Page number from query string (1-indexed)
 * @param limit - Number of items per page from query string
 * @returns Validated pagination parameters with safe defaults
 * 
 * @example
 * ```typescript
 * const { page, limit, skip } = parsePaginationParams(req.query.page, req.query.limit);
 * const results = await repository.find().skip(skip).limit(limit);
 * ```
 */
export function parsePaginationParams(
  page?: string | number | null,
  limit?: string | number | null,
): PaginationParams {
  // Parse page
  let parsedPage: number = PAGINATION_LIMITS.DEFAULT_PAGE;
  if (page !== null && page !== undefined && page !== '') {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    if (Number.isInteger(pageNum) && pageNum >= PAGINATION_LIMITS.MIN_PAGE) {
      parsedPage = pageNum;
    }
  }

  // Parse limit with max boundary
  let parsedLimit: number = PAGINATION_LIMITS.DEFAULT_LIMIT;
  if (limit !== null && limit !== undefined && limit !== '') {
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    if (Number.isInteger(limitNum)) {
      if (limitNum > PAGINATION_LIMITS.MAX_LIMIT) {
        parsedLimit = PAGINATION_LIMITS.MAX_LIMIT;
      } else if (limitNum < PAGINATION_LIMITS.MIN_LIMIT) {
        parsedLimit = PAGINATION_LIMITS.DEFAULT_LIMIT;
      } else {
        parsedLimit = limitNum;
      }
    }
  }

  // Calculate skip for database queries
  const skip = (parsedPage - 1) * parsedLimit;

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip,
  };
}

/**
 * Validates pagination parameters and throws an error if invalid.
 * Use this when you want to reject invalid parameters instead of using defaults.
 * 
 * @param page - Page number to validate
 * @param limit - Limit to validate
 * @throws BadRequestException if parameters are invalid
 */
export function validatePaginationParams(
  page?: string | number | null,
  limit?: string | number | null,
): void {
  if (page !== null && page !== undefined && page !== '') {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    if (!Number.isInteger(pageNum) || pageNum < PAGINATION_LIMITS.MIN_PAGE) {
      throw new Error(
        `Invalid page parameter: must be an integer >= ${PAGINATION_LIMITS.MIN_PAGE}`,
      );
    }
  }

  if (limit !== null && limit !== undefined && limit !== '') {
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    if (!Number.isInteger(limitNum) || limitNum < PAGINATION_LIMITS.MIN_LIMIT) {
      throw new Error(
        `Invalid limit parameter: must be an integer >= ${PAGINATION_LIMITS.MIN_LIMIT}`,
      );
    }
    if (limitNum > PAGINATION_LIMITS.MAX_LIMIT) {
      throw new Error(
        `Invalid limit parameter: cannot exceed ${PAGINATION_LIMITS.MAX_LIMIT}`,
      );
    }
  }
}

/**
 * Calculates total pages from total count and limit.
 * 
 * @param totalCount - Total number of items
 * @param limit - Items per page
 * @returns Total number of pages
 */
export function calculateTotalPages(totalCount: number, limit: number): number {
  if (limit <= 0 || totalCount <= 0) return 0;
  return Math.ceil(totalCount / limit);
}

/**
 * Creates a pagination metadata object for API responses.
 * 
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalCount - Total number of items
 * @returns Pagination metadata
 */
export function createPaginationMetadata(
  page: number,
  limit: number,
  totalCount: number,
) {
  const totalPages = calculateTotalPages(totalCount, limit);
  
  return {
    page,
    limit,
    totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Creates a paginated result object for API responses.
 * 
 * @param items - Array of items for the current page
 * @param total - Total number of items across all pages
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Paginated result object
 */
export function paginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
) {
  const totalPages = calculateTotalPages(total, limit);
  
  return {
    items,
    total,
    page,
    limit,
    meta: {
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
