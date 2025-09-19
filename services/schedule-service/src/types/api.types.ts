export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse extends ApiResponse<null> {
  success: false;
  data: null;
  errors?: string[];
}
