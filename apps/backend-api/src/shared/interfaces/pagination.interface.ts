export type PaginationMeta = {
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

/**
 * Standard paginated response shape.
 *
 * The top-level total/page/limit fields are kept for backward compatibility with
 * existing frontend code. New consumers should prefer `meta` for derived values.
 */
export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  meta: PaginationMeta;
};
