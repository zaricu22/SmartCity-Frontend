export interface LoginResponse {
  readonly token: string;
  readonly role: string;
  readonly expiresInMs: number;
  readonly refreshToken: string;
}
