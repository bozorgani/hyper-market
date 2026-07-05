import { PaginatedResult, PaginationMeta } from '../interfaces/pagination.interface';

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const safeLimit = Math.max(limit, 1);
  const safePage = Math.max(page, 1);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    limit,
    meta: buildPaginationMeta(total, page, limit),
  };
}
