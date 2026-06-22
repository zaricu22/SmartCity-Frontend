import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RegisterComponent } from './register.component';
import { AuthApiService } from '../../../infrastructure/service/auth-api.service';
import { AuthService } from '../../../infrastructure/service/auth.service';
import { LoginResponse } from '../../../infrastructure/model/login.response';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let authApi: jest.Mocked<AuthApiService>;
  let auth: jest.Mocked<AuthService>;
  let router: Router;

  const mockResponse: LoginResponse = {
    token: 'jwt-token',
    role: 'VIEWER',
    expiresInMs: 3_600_000,
    refreshToken: 'refresh-uuid',
  };

  beforeEach(async () => {
    authApi = { register: jest.fn().mockReturnValue(of(mockResponse)) } as unknown as jest.Mocked<AuthApiService>;
    auth = { setToken: jest.fn() } as unknown as jest.Mocked<AuthService>;

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthApiService, useValue: authApi },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not call the API when the form is invalid', () => {
    component.register();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('should report passwordsMismatch when passwords differ', () => {
    component.form.setValue({ email: 'user@example.com', password: 'password1', confirmPassword: 'password2' });
    expect(component.form.errors).toEqual({ passwordsMismatch: true });
  });

  it('should have no form errors when passwords match', () => {
    component.form.setValue({ email: 'user@example.com', password: 'password1', confirmPassword: 'password1' });
    expect(component.form.errors).toBeNull();
  });

  it('should call register, setToken with the response, and navigate to / on success', () => {
    component.form.setValue({ email: 'user@example.com', password: 'password1', confirmPassword: 'password1' });
    component.register();
    expect(authApi.register).toHaveBeenCalledWith('user@example.com', 'password1');
    expect(auth.setToken).toHaveBeenCalledWith('jwt-token', 'VIEWER', 3_600_000, 'refresh-uuid');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should show duplicate email error on 409', () => {
    authApi.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component.form.setValue({ email: 'existing@example.com', password: 'password1', confirmPassword: 'password1' });
    component.register();
    expect(component.errorMessage()).toBe('This email is already registered.');
    expect(component.isLoading()).toBe(false);
  });

  it('should show generic error for non-409 failures', () => {
    authApi.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.form.setValue({ email: 'user@example.com', password: 'password1', confirmPassword: 'password1' });
    component.register();
    expect(component.errorMessage()).toBe('Registration failed. Please try again.');
    expect(component.isLoading()).toBe(false);
  });
});
