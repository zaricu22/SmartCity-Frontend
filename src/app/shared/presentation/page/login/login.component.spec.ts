import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../infrastructure/auth/auth.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let auth: jest.Mocked<AuthService>;
  let router: jest.Mocked<Router>;
  let routeGetSpy: jest.Mock;

  beforeEach(async () => {
    auth = { setToken: jest.fn() } as unknown as jest.Mocked<AuthService>;
    router = { navigateByUrl: jest.fn().mockResolvedValue(true) } as unknown as jest.Mocked<Router>;
    routeGetSpy = jest.fn().mockReturnValue(null);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: routeGetSpy } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call setToken with admin credentials and navigate to / by default', () => {
    component.loginAsAdmin();
    expect(auth.setToken).toHaveBeenCalledWith('stub-admin-token', 'ADMIN');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should call setToken with viewer credentials and navigate to / by default', () => {
    component.loginAsViewer();
    expect(auth.setToken).toHaveBeenCalledWith('stub-viewer-token', 'VIEWER');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should redirect to returnUrl when present in query params', () => {
    routeGetSpy.mockReturnValue('/assets');
    component.loginAsAdmin();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/assets');
  });
});
