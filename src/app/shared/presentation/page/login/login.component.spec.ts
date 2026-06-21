import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../infrastructure/auth/auth.service';
import { AuthApiService } from '../../../infrastructure/auth/auth-api.service';
import { LoginResponse } from '../../../infrastructure/auth/login.response';
import { API_BASE_URL } from '../../../infrastructure/api/api.config';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let auth: jest.Mocked<AuthService>;
  let authApi: jest.Mocked<AuthApiService>;
  let router: Router;
  let routeGetSpy: jest.Mock;

  const mockResponse: LoginResponse = { token: 'jwt-token', role: 'ADMIN', expiresInMs: 3_600_000, refreshToken: 'refresh-uuid' };

  beforeEach(async () => {
    auth = { setToken: jest.fn() } as unknown as jest.Mocked<AuthService>;
    authApi = { login: jest.fn().mockReturnValue(of(mockResponse)) } as unknown as jest.Mocked<AuthApiService>;
    routeGetSpy = jest.fn().mockReturnValue(null);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        // provideRouter must come before ActivatedRoute mock — it registers its own
        // ActivatedRoute; placing it after would override the custom mock (see ADR-0017).
        // RouterLink also requires a real Router with an events Observable.
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: AuthApiService, useValue: authApi },
        { provide: API_BASE_URL, useValue: 'http://localhost:8080' },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: routeGetSpy } } },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not call the API when the form is invalid', () => {
    component.login();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('should call AuthApiService.login with form values and setToken on success', () => {
    component.form.setValue({ username: 'admin', password: 'secret' });
    component.login();
    expect(authApi.login).toHaveBeenCalledWith('admin', 'secret');
    expect(auth.setToken).toHaveBeenCalledWith('jwt-token', 'ADMIN', 3_600_000, 'refresh-uuid');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should set errorMessage on login failure', () => {
    authApi.login.mockReturnValue(throwError(() => new Error('Unauthorized')));
    component.form.setValue({ username: 'admin', password: 'wrong' });
    component.login();
    expect(component.errorMessage()).toBe('Invalid email or password.');
    expect(auth.setToken).not.toHaveBeenCalled();
  });

  it('should reset isLoading to false on error', () => {
    authApi.login.mockReturnValue(throwError(() => new Error()));
    component.form.setValue({ username: 'admin', password: 'wrong' });
    component.login();
    expect(component.isLoading()).toBe(false);
  });

  it('should redirect to returnUrl when present in query params', () => {
    routeGetSpy.mockReturnValue('/assets');
    component.form.setValue({ username: 'admin', password: 'secret' });
    component.login();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/assets');
  });

  it('should set window.location.href to the Google OAuth URL on loginWithGoogle', () => {
    const location = { href: '' };
    Object.defineProperty(window, 'location', { configurable: true, value: location });
    component.loginWithGoogle();
    expect(location.href).toBe('http://localhost:8080/oauth2/authorization/google');
  });
});
