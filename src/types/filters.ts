export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BaseFilterState extends PaginationParams {
  searchQuery?: string;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}
