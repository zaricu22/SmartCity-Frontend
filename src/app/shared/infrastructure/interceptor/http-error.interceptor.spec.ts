import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { httpErrorInterceptor } from './http-error.interceptor';
import { AppHttpError } from '../error/app-http-error';

describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it.each([
    [400, 'BAD_REQUEST'],
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [422, 'UNPROCESSABLE'],
    [429, 'TOO_MANY_REQUESTS'],
  ])('should surface a %i response from the server as a %s error', (status, code) => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller.expectOne('/api/test').flush('Error', { status, statusText: 'Error' });
    expect(error).toBeInstanceOf(AppHttpError);
    expect((error as AppHttpError).status).toBe(status);
    expect((error as AppHttpError).code).toBe(code);
  });

  it('should give up and report a server error after 2 retries still get a 500 response', fakeAsync(() => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller.expectOne('/api/test').flush('Error', { status: 500, statusText: 'Internal Server Error' });
    tick(1000);
    controller.expectOne('/api/test').flush('Error', { status: 500, statusText: 'Internal Server Error' });
    tick(2000);
    controller.expectOne('/api/test').flush('Error', { status: 500, statusText: 'Internal Server Error' });
    expect(error).toBeInstanceOf(AppHttpError);
    expect((error as AppHttpError).code).toBe('SERVER_ERROR');
    expect((error as AppHttpError).status).toBe(500);
  }));

  it('should still surface an unrecognized 4xx status (418) as an error, even with no specific handling for it', () => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller.expectOne('/api/test').flush('Error', { status: 418, statusText: "I'm a teapot" });
    expect(error).toBeInstanceOf(AppHttpError);
    expect((error as AppHttpError).code).toBe('UNKNOWN_ERROR');
    expect((error as AppHttpError).status).toBe(418);
  });

  it("should use the server's own error code when the response body provides one", () => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller
      .expectOne('/api/test')
      .flush({ errorCode: 'CUSTOM_CODE', message: null }, { status: 400, statusText: 'Bad Request' });
    expect((error as AppHttpError).code).toBe('CUSTOM_CODE');
  });

  it("should show the server's own error message when the response body provides one", () => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller
      .expectOne('/api/test')
      .flush({ errorCode: null, message: 'Custom error message' }, { status: 400, statusText: 'Bad Request' });
    expect((error as AppHttpError).userMessage).toBe('Custom error message');
  });

  it('should report a conflict when the item was changed by someone else in the meantime (409 response)', () => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller
      .expectOne('/api/test')
      .flush(
        { errorCode: 'CONCURRENT_MODIFICATION', message: 'The resource was modified by another request. Please retry.' },
        { status: 409, statusText: 'Conflict' },
      );
    expect((error as AppHttpError).code).toBe('CONCURRENT_MODIFICATION');
    expect((error as AppHttpError).userMessage).toBe('The resource was modified by another request. Please retry.');
  });

  it('should treat the request as timed out if the server takes more than 30 seconds to respond', fakeAsync(() => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller.expectOne('/api/test'); // pending but never flushed — simulates a slow server
    tick(30_001);
    expect(error).toBeInstanceOf(AppHttpError);
    expect((error as AppHttpError).code).toBe('TIMEOUT');
    expect((error as AppHttpError).status).toBe(0);
  }));

  it('should not retry on 4xx errors', () => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller.expectOne('/api/test').flush('Error', { status: 400, statusText: 'Bad Request' });
    controller.expectNone('/api/test');
    expect(error).toBeInstanceOf(AppHttpError);
  });

  it('should retry twice on network errors and eventually propagate the error', fakeAsync(() => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller.expectOne('/api/test').error(new ProgressEvent('error'));
    tick(1000);
    controller.expectOne('/api/test').error(new ProgressEvent('error'));
    tick(2000);
    controller.expectOne('/api/test').error(new ProgressEvent('error'));
    expect(error).toBeInstanceOf(AppHttpError);
  }));
});
