import { HttpInterceptorFn } from '@angular/common/http';

// Mirrors the backend RequestIdFilter — attaches a per-request correlation ID
export const requestIdInterceptor: HttpInterceptorFn = (req, next) => {
  // OUTGOING
  const requestId = crypto.randomUUID();
  const cloned = req.clone({ setHeaders: { 'X-Request-Id': requestId } });
  // INCOMING 
  return next(cloned);
};
