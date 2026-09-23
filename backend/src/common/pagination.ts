export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * CONTRACTS.md §8.2. Shared paginate() so all 4 list endpoints wrap their
 * array the same way: { data, page, pageSize, total }.
 */
export function paginate<T>(items: T[], pageParam?: string, pageSizeParam?: string): PaginatedResponse<T> {
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const pageSize = Math.max(1, parseInt(pageSizeParam ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: items.slice(start, end),
    page,
    pageSize,
    total: items.length,
  };
}
