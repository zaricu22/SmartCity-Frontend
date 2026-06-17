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
  ])('should map HTTP %i to AppHttpError with code %s', (status, code) => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller.expectOne('/api/test').flush('Error', { status, statusText: 'Error' });
    expect(error).toBeInstanceOf(AppHttpError);
    expect((error as AppHttpError).status).toBe(status);
    expect((error as AppHttpError).code).toBe(code);
  });

  it('should map a 500 response to SERVER_ERROR after all retries are exhausted', fakeAsync(() => {
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

  it('should map an unknown 4xx (418) to AppHttpError with code UNKNOWN_ERROR', () => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller.expectOne('/api/test').flush('Error', { status: 418, statusText: "I'm a teapot" });
    expect(error).toBeInstanceOf(AppHttpError);
    expect((error as AppHttpError).code).toBe('UNKNOWN_ERROR');
    expect((error as AppHttpError).status).toBe(418);
  });

  it('should use body.code when the error body contains a code field', () => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller
      .expectOne('/api/test')
      .flush({ code: 'CUSTOM_CODE', message: null }, { status: 400, statusText: 'Bad Request' });
    expect((error as AppHttpError).code).toBe('CUSTOM_CODE');
  });

  it('should use body.message when the error body contains a message field', () => {
    let error: unknown;
    http.get('/api/test').subscribe({ error: e => (error = e) });
    controller
      .expectOne('/api/test')
      .flush({ code: null, message: 'Custom error message' }, { status: 400, statusText: 'Bad Request' });
    expect((error as AppHttpError).userMessage).toBe('Custom error message');
  });

  it('should emit AppHttpError with code TIMEOUT when the request exceeds 30 seconds', fakeAsync(() => {
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
