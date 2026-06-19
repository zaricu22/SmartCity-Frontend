export interface PageRequest {
  readonly page: number;
  readonly size: number;
  readonly sort: string;
  readonly direction: 'asc' | 'desc';
}

export const DEFAULT_PAGE_REQUEST: PageRequest = {
  page: 0,
  size: 10,
  sort: 'name',
  direction: 'asc',
};
