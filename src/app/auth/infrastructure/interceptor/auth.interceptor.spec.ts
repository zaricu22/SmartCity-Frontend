import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../service/auth.service';
import { AuthApiService } from '../service/auth-api.service';
import { LoginResponse } from '../model/login.response';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: jest.Mocked<Pick<AuthService, 'getToken' | 'getRefreshToken' | 'setToken' | 'logout'>>;
  let authApi: jest.Mocked<Pick<AuthApiService, 'refresh'>>;
  let router: jest.Mocked<Pick<Router, 'navigate'>>;

  const refreshResponse: LoginResponse = {
    token: 'new-token',
    role: 'ADMIN',
    expiresInMs: 3_600_000,
    refreshToken: 'new-refresh',
  };

  beforeEach(() => {
    auth = {
      getToken: jest.fn().mockReturnValue(null),
      getRefreshToken: jest.fn().mockReturnValue(null),
      setToken: jest.fn(),
      logout: jest.fn(),
    };
    authApi = { refresh: jest.fn().mockReturnValue(of(refreshResponse)) };
    router = { navigate: jest.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: AuthApiService, useValue: authApi },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('should not attach an Authorization header when no token is held', () => {
    http.get('/api/test').subscribe();
    const req = controller.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should attach a Bearer token when AuthService holds a token', () => {
    auth.getToken.mockReturnValue('my-token');
    http.get('/api/test').subscribe();
    const req = controller.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  });

  it('should pass through non-401 errors without attempting a refresh', () => {
    auth.getToken.mockReturnValue('my-token');
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller.expectOne('/api/test').flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    expect(authApi.refresh).not.toHaveBeenCalled();
    expect(error).toBeDefined();
  });

  it('should logout and navigate to /login on 401 when no refresh token is held', () => {
    auth.getToken.mockReturnValue('my-token');
    auth.getRefreshToken.mockReturnValue(null);
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller.expectOne('/api/test').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    expect(authApi.refresh).not.toHaveBeenCalled();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(error).toBeDefined();
  });

  it('should silently refresh, update tokens, and retry the original request on 401', () => {
    auth.getToken.mockReturnValue('old-token');
    auth.getRefreshToken.mockReturnValue('old-refresh');
    let result: unknown;
    http.get('/api/test').subscribe(r => (result = r));

    controller.expectOne('/api/test').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authApi.refresh).toHaveBeenCalledWith('old-refresh');
    expect(auth.setToken).toHaveBeenCalledWith('new-token', 'ADMIN', 3_600_000, 'new-refresh');

    // The interceptor calls next(req) again with the new token — controller sees a second request
    const retried = controller.expectOne('/api/test');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer new-token');
    retried.flush({ data: 'ok' });
    expect(result).toEqual({ data: 'ok' });
  });

  it('should logout and navigate to /login when the refresh call fails', () => {
    auth.getToken.mockReturnValue('old-token');
    auth.getRefreshToken.mockReturnValue('expired-refresh');
    authApi.refresh.mockReturnValue(throwError(() => new Error('Refresh failed')));
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller.expectOne('/api/test').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(error).toBeDefined();
  });
});
