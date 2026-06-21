import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { authGuard, loggedInGuard, roleGuard } from './auth.guard';
import { AuthService } from '../service/auth.service';

describe('auth guards', () => {
  let auth: jest.Mocked<Pick<AuthService, 'isAuthenticated' | 'hasRole'>>;
  let router: Router;

  beforeEach(() => {
    auth = {
      isAuthenticated: jest.fn().mockReturnValue(false),
      hasRole: jest.fn().mockReturnValue(false),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    });
    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    const run = (url: string) =>
      TestBed.runInInjectionContext(() =>
        authGuard({} as never, { url } as RouterStateSnapshot),
      );

    it('should return true when authenticated', () => {
      auth.isAuthenticated.mockReturnValue(true);
      expect(run('/assets')).toBe(true);
    });

    it('should redirect to /login with returnUrl when not authenticated', () => {
      expect(run('/assets')).toEqual(
        router.createUrlTree(['/login'], { queryParams: { returnUrl: '/assets' } }),
      );
    });
  });

  describe('loggedInGuard', () => {
    const run = () =>
      TestBed.runInInjectionContext(() =>
        loggedInGuard({} as never, {} as RouterStateSnapshot),
      );

    it('should redirect to / when already authenticated', () => {
      auth.isAuthenticated.mockReturnValue(true);
      expect(run()).toEqual(router.createUrlTree(['/']));
    });

    it('should return true when not authenticated', () => {
      expect(run()).toBe(true);
    });
  });

  describe('roleGuard', () => {
    const run = (role: 'ADMIN' | 'VIEWER') =>
      TestBed.runInInjectionContext(() =>
        roleGuard(role)({} as never, {} as RouterStateSnapshot),
      );

    it('should redirect to /login when not authenticated', () => {
      expect(run('VIEWER')).toEqual(router.createUrlTree(['/login']));
    });

    it('should return true when authenticated and has required role', () => {
      auth.isAuthenticated.mockReturnValue(true);
      auth.hasRole.mockReturnValue(true);
      expect(run('ADMIN')).toBe(true);
    });

    it('should redirect to /forbidden when authenticated but lacks required role', () => {
      auth.isAuthenticated.mockReturnValue(true);
      auth.hasRole.mockReturnValue(false);
      expect(run('ADMIN')).toEqual(router.createUrlTree(['/forbidden']));
    });
  });
});
