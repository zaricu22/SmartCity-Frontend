// Mirrors the backend's PagedResult<T> record (not Spring's default Page<T> envelope)
export interface PageResponse<T> {
  readonly content: T[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}
