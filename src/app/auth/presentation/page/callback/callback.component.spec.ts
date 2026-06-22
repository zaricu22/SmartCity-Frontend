import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { CallbackComponent } from './callback.component';
import { AuthService } from '../../../infrastructure/service/auth.service';

// Replace window.location with a getter backed by a mutable object.
// Object.defineProperty with a value descriptor is not reliably redefinable
// within the same jsdom window across multiple tests; a getter is.
const mockLocation = { hash: '' };
Object.defineProperty(window, 'location', {
  configurable: true,
  get: () => mockLocation,
});

function setHash(fragment: string): void {
  mockLocation.hash = `#${fragment}`;
}

describe('CallbackComponent', () => {
  let auth: jest.Mocked<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = { setToken: jest.fn() } as unknown as jest.Mocked<AuthService>;
  });

  describe('in browser', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [CallbackComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: auth },
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      }).compileComponents();

      router = TestBed.inject(Router);
      jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    });

    it('should call setToken and navigate to / with a valid fragment', () => {
      setHash('token=jwt&role=VIEWER&expiresInMs=3600000&refreshToken=refresh-uuid');
      TestBed.createComponent(CallbackComponent).detectChanges();
      expect(auth.setToken).toHaveBeenCalledWith('jwt', 'VIEWER', 3600000, 'refresh-uuid');
      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('should navigate to /login when token is missing', () => {
      setHash('role=VIEWER&expiresInMs=3600000');
      TestBed.createComponent(CallbackComponent).detectChanges();
      expect(auth.setToken).not.toHaveBeenCalled();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    });

    it('should navigate to /login when role is missing', () => {
      setHash('token=jwt&expiresInMs=3600000');
      TestBed.createComponent(CallbackComponent).detectChanges();
      expect(auth.setToken).not.toHaveBeenCalled();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    });

    it('should navigate to /login when expiresInMs is missing', () => {
      setHash('token=jwt&role=VIEWER');
      TestBed.createComponent(CallbackComponent).detectChanges();
      expect(auth.setToken).not.toHaveBeenCalled();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    });

    it('should pass undefined refreshToken when absent from fragment', () => {
      setHash('token=jwt&role=ADMIN&expiresInMs=3600000');
      TestBed.createComponent(CallbackComponent).detectChanges();
      expect(auth.setToken).toHaveBeenCalledWith('jwt', 'ADMIN', 3600000, undefined);
    });
  });

  describe('during SSR', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [CallbackComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: auth },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      }).compileComponents();

      router = TestBed.inject(Router);
      jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    });

    it('should not call setToken or navigate', () => {
      setHash('token=jwt&role=VIEWER&expiresInMs=3600000&refreshToken=refresh-uuid');
      TestBed.createComponent(CallbackComponent).detectChanges();
      expect(auth.setToken).not.toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });
});
