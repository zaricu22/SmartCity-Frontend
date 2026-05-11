import { InjectionToken } from '@angular/core';
import { environment } from '../../../../environments/environment';

// Use this token to inject the API base URL — value is sourced from environment files
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
export const DEFAULT_API_BASE_URL = environment.apiBaseUrl;
