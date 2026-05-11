import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, retry, throwError, timer } from 'rxjs';
import { AppHttpError } from '../error/app-http-error';

const STATUS_MAP: Record<number, { code: string; userMessage: string }> = {
  400: { code: 'BAD_REQUEST',     userMessage: 'Invalid request data.' },
  401: { code: 'UNAUTHORIZED',    userMessage: 'You are not authenticated.' },
  403: { code: 'FORBIDDEN',       userMessage: 'You do not have permission.' },
  404: { code: 'NOT_FOUND',       userMessage: 'The requested resource was not found.' },
  409: { code: 'CONFLICT',        userMessage: 'A conflict occurred. The resource may already exist.' },
  422: { code: 'UNPROCESSABLE',   userMessage: 'The server could not process the request.' },
};

const isRetryable = (err: unknown): boolean =>
  err instanceof HttpErrorResponse && (err.status === 0 || err.status >= 500);

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) =>
  // INCOMING 
  next(req).pipe(
    // Retry up to 2 times on network failures (status 0) or 5xx — with exponential backoff.
    // 4xx errors are not retried (client mistakes won't fix themselves).
    retry({
      count: 2,
      delay: (err, attempt) =>
        isRetryable(err) ? timer(attempt * 1000) : throwError(() => err),
    }),
    catchError((err: HttpErrorResponse) => {
      const body = err.error as { code?: string; message?: string } | null;
      const fallback = STATUS_MAP[err.status] ?? (
        err.status >= 500
          ? { code: 'SERVER_ERROR',  userMessage: 'A server error occurred. Please try again later.' }
          : { code: 'UNKNOWN_ERROR', userMessage: 'An unexpected error occurred.' }
      );
      const code = body?.code ?? fallback.code;
      const userMessage = body?.message ?? fallback.userMessage;
      return throwError(() => new AppHttpError(err.status, code, userMessage));
    }),
  );
