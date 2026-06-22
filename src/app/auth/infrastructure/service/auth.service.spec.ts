import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  describe('setToken', () => {
    it('should store token and role', () => {
      service.setToken('my-token', 'ADMIN');
      expect(service.getToken()).toBe('my-token');
      expect(service.getRole()).toBe('ADMIN');
    });

    it('should store refreshToken when provided', () => {
      service.setToken('t', 'ADMIN', 3_600_000, 'refresh-uuid');
      expect(service.getRefreshToken()).toBe('refresh-uuid');
    });

    it('should not overwrite refreshToken when the fourth arg is omitted', () => {
      service.setToken('t1', 'ADMIN', 3_600_000, 'first-refresh');
      service.setToken('t2', 'VIEWER', 3_600_000);
      expect(service.getRefreshToken()).toBe('first-refresh');
    });

    it('should overwrite refreshToken when a new value is supplied', () => {
      service.setToken('t1', 'ADMIN', 3_600_000, 'old');
      service.setToken('t2', 'ADMIN', 3_600_000, 'new');
      expect(service.getRefreshToken()).toBe('new');
    });
  });

  describe('logout', () => {
    it('should clear token, role, expiresAt, and refreshToken', () => {
      service.setToken('t', 'ADMIN', 3_600_000, 'r');
      service.logout();
      expect(service.getToken()).toBeNull();
      expect(service.getRole()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('clearToken', () => {
    it('should behave identically to logout', () => {
      service.setToken('t', 'ADMIN', 3_600_000, 'r');
      service.clearToken();
      expect(service.getToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });
  });

  describe('isExpired', () => {
    it('should return false when no token is set', () => {
      expect(service.isExpired()).toBe(false);
    });

    it('should return false for a freshly set token', () => {
      service.setToken('t', 'ADMIN', 3_600_000);
      expect(service.isExpired()).toBe(false);
    });

    it('should return true when expiryMs is negative (already in the past)', () => {
      service.setToken('t', 'ADMIN', -1);
      expect(service.isExpired()).toBe(true);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token has been set', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return true for a valid, non-expired token', () => {
      service.setToken('t', 'ADMIN', 3_600_000);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when the token has expired', () => {
      service.setToken('t', 'ADMIN', -1);
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return false when no role is set', () => {
      expect(service.hasRole('VIEWER')).toBe(false);
    });

    it('should return true when role matches exactly', () => {
      service.setToken('t', 'VIEWER', 3_600_000);
      expect(service.hasRole('VIEWER')).toBe(true);
    });

    it('should return true when ADMIN satisfies a VIEWER requirement', () => {
      service.setToken('t', 'ADMIN', 3_600_000);
      expect(service.hasRole('VIEWER')).toBe(true);
    });

    it('should return false when VIEWER does not satisfy an ADMIN requirement', () => {
      service.setToken('t', 'VIEWER', 3_600_000);
      expect(service.hasRole('ADMIN')).toBe(false);
    });
  });
});
