import { APP_INITIALIZER, ApplicationConfig, ErrorHandler, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';

import { routes } from './app.routes';
import { requestIdInterceptor } from './shared/infrastructure/interceptor/request-id.interceptor';
import { authInterceptor } from './shared/infrastructure/interceptor/auth.interceptor';
import { httpErrorInterceptor } from './shared/infrastructure/interceptor/http-error.interceptor';
import { GlobalErrorHandler } from './shared/infrastructure/error/global-error-handler';
import { API_BASE_URL, DEFAULT_API_BASE_URL } from './shared/infrastructure/api/api.config';
import { AuthService } from './shared/infrastructure/auth/auth.service';

// Runs before the first route is activated.
// Clears any expired in-memory token so the auth guard redirects to /login cleanly.
// Extend this factory to load remote config, refresh tokens, etc.
function initializeApp(auth: AuthService) {
  return () => {
    if (auth.isExpired()) {
      auth.logout();
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(
      withFetch(),
      withInterceptors([requestIdInterceptor, authInterceptor, httpErrorInterceptor]),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    { provide: API_BASE_URL, useValue: DEFAULT_API_BASE_URL },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // useFactory receives deps[] as arguments and must return the initialiser function Angular calls before routing starts.
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true,
    },
  ],
};
