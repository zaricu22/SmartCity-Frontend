import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HeaderComponent } from './header.component';
import { AuthService } from '../../../infrastructure/auth/auth.service';
import { AuthApiService } from '../../../infrastructure/auth/auth-api.service';
import { API_BASE_URL } from '../../../infrastructure/api/api.config';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;
  let auth: jest.Mocked<Pick<AuthService, 'logout' | 'getRefreshToken'>>;
  let authApi: jest.Mocked<Pick<AuthApiService, 'logout'>>;
  let router: Router;

  beforeEach(async () => {
    auth = {
      logout: jest.fn(),
      getRefreshToken: jest.fn().mockReturnValue('refresh-uuid'),
    };
    authApi = { logout: jest.fn().mockReturnValue(of(null)) };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AuthApiService, useValue: authApi },
        { provide: API_BASE_URL, useValue: 'http://localhost:8080' },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call authApi.logout, then auth.logout and navigate to /login', () => {
    component.logout();
    expect(authApi.logout).toHaveBeenCalledWith('refresh-uuid');
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should still clear state and navigate if backend logout fails', () => {
    authApi.logout.mockReturnValue(throwError(() => new Error('Network error')));
    component.logout();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should skip the API call and clear state directly when no refresh token is held', () => {
    auth.getRefreshToken.mockReturnValue(null);
    component.logout();
    expect(authApi.logout).not.toHaveBeenCalled();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
