export interface PageRequest {
  readonly page: number;
  readonly size: number;
  readonly sort: string;
  readonly direction: 'asc' | 'desc';
  readonly eligible?: boolean;
  // Case-insensitive "contains" match, combined with AND — not applied when eligible=true
  // (backend uses a separate subsidy-eligibility query path for that case).
  readonly name?: string;
  readonly location?: string;
}

export const DEFAULT_PAGE_REQUEST: PageRequest = {
  page: 0,
  size: 10,
  sort: 'name',
  direction: 'asc',
};
