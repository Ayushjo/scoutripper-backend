export interface TrekFilters {
  status?: string;
  categoryId?: number;
  locationSlug?: string;
  isFeatured?: string;
  minPrice?: number;
  maxPrice?: number;
  duration?: number;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
}
