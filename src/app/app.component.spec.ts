import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { API_BASE_URL, DEFAULT_API_BASE_URL } from './shared/infrastructure/api/api.config';
import { ToastService } from './shared/presentation/service/toast.service';

describe('AppComponent', () => {
  let http: HttpTestingController;
  let toastService: ToastService;

  const PING_URL = `${DEFAULT_API_BASE_URL}/v1/buildings/all`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: DEFAULT_API_BASE_URL },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => http.verify());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    http.expectOne(PING_URL).flush([]);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have the 'smartcityfront' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    http.expectOne(PING_URL).flush([]);
    expect(fixture.componentInstance.title).toEqual('smartcityfront');
  });

  it('should render router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    http.expectOne(PING_URL).flush([]);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('does not warn when the backend ping succeeds', () => {
    TestBed.createComponent(AppComponent);
    http.expectOne(PING_URL).flush([]);
    expect(toastService.toasts()).toEqual([]);
  });

  it('does not warn when the backend responds with a real HTTP error status', () => {
    TestBed.createComponent(AppComponent);
    http.expectOne(PING_URL).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    expect(toastService.toasts()).toEqual([]);
  });

  it('warns once when the ping fails with no response (status 0)', () => {
    TestBed.createComponent(AppComponent);
    http.expectOne(PING_URL).error(new ProgressEvent('error'));

    const toasts = toastService.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('warning');
  });
});
