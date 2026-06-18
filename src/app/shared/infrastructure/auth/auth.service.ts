import { Injectable } from '@angular/core';

export type UserRole = 'ADMIN' | 'VIEWER';

// Higher number = more permissions. ADMIN satisfies any role requirement VIEWER has.
const ROLE_RANK: Record<UserRole, number> = { VIEWER: 1, ADMIN: 2 };

const DEFAULT_EXPIRY_MS = 3_600_000; // 1 hour

// Token and role stored in memory only — never written to localStorage or sessionStorage
@Injectable({ providedIn: 'root' })
export class AuthService {
  private token: string | null = null;
  private role: UserRole | null = null;
  private expiresAt: number | null = null;
  private refreshToken: string | null = null;

  setToken(token: string, role: UserRole, expiryMs: number = DEFAULT_EXPIRY_MS, refreshToken?: string): void {
    this.token = token;
    this.role = role;
    this.expiresAt = Date.now() + expiryMs;
    // undefined = arg omitted — keep the existing refresh token; an explicit value overwrites it
    if (refreshToken !== undefined) this.refreshToken = refreshToken;
  }

  logout(): void {
    this.token = null;
    this.role = null;
    this.expiresAt = null;
    this.refreshToken = null;
  }

  /** @deprecated use logout() */
  clearToken(): void { this.logout(); }

  getToken(): string | null { return this.token; }
  getRole(): UserRole | null { return this.role; }
  getRefreshToken(): string | null { return this.refreshToken; }
  isExpired(): boolean { return this.expiresAt !== null && Date.now() > this.expiresAt; }
  isAuthenticated(): boolean { return this.token !== null && !this.isExpired(); }
  hasRole(required: UserRole): boolean {
    return this.role !== null && ROLE_RANK[this.role] >= ROLE_RANK[required];
  }
}
