import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthApiService } from './auth-api.service';
import { API_BASE_URL } from '../api/api.config';
import { LoginResponse } from './login.response';

// provideHttpClientTesting() overrides the HttpBackend token with a mock backend.
// AuthApiService.refreshHttp uses new HttpClient(inject(HttpBackend)), which resolves to
// the same mock, so HttpTestingController intercepts requests from both http and refreshHttp.
describe('AuthApiService', () => {
  let service: AuthApiService;
  let controller: HttpTestingController;

  const base = 'http://localhost:8080';
  const mockResponse: LoginResponse = {
    token: 'jwt-token',
    role: 'ADMIN',
    expiresInMs: 3_600_000,
    refreshToken: 'refresh-uuid',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: base },
      ],
    });
    service = TestBed.inject(AuthApiService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('login()', () => {
    it('should POST to /v1/auth/login with username and password', () => {
      let result: LoginResponse | undefined;
      service.login('admin', 'secret').subscribe(r => (result = r));
      const req = controller.expectOne(`${base}/v1/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'admin', password: 'secret' });
      req.flush(mockResponse);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('refresh()', () => {
    it('should POST to /v1/auth/refresh with the refresh token', () => {
      let result: LoginResponse | undefined;
      service.refresh('my-refresh-token').subscribe(r => (result = r));
      const req = controller.expectOne(`${base}/v1/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'my-refresh-token' });
      req.flush(mockResponse);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('logout()', () => {
    it('should POST to /v1/auth/logout with the refresh token', () => {
      let completed = false;
      service.logout('my-refresh-token').subscribe({ complete: () => (completed = true) });
      const req = controller.expectOne(`${base}/v1/auth/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'my-refresh-token' });
      req.flush(null);
      expect(completed).toBe(true);
    });
  });

  describe('register()', () => {
    it('should POST to /v1/auth/register with email and password', () => {
      let completed = false;
      service.register('user@example.com', 'password123').subscribe({ complete: () => (completed = true) });
      const req = controller.expectOne(`${base}/v1/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'user@example.com', password: 'password123' });
      req.flush(null, { status: 201, statusText: 'Created' });
      expect(completed).toBe(true);
    });
  });
});
