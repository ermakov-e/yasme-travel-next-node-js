export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
