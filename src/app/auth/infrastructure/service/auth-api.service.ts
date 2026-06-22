import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../shared/infrastructure/api/api.config';
import { LoginResponse } from '../model/login.response';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  // HttpBackend bypasses the interceptor chain — prevents the circular dependency
  // authInterceptor → AuthApiService.refresh() → HttpClient → authInterceptor → ...
  private readonly refreshHttp = new HttpClient(inject(HttpBackend));
  private readonly base = `${inject(API_BASE_URL)}/v1/auth`;

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/login`, { username, password });
  }

  register(email: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.base}/register`, { email, password });
  }

  refresh(refreshToken: string): Observable<LoginResponse> {
    return this.refreshHttp.post<LoginResponse>(`${this.base}/refresh`, { refreshToken });
  }

  // Uses the normal HttpClient so authInterceptor attaches the Bearer token automatically.
  // The backend requires a valid JWT to revoke — logout cannot use HttpBackend.
  logout(refreshToken: string): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, { refreshToken });
  }
}
