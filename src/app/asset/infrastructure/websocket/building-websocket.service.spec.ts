import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { BuildingWebSocketService } from './building-websocket.service';
import { EventBusService } from '../../../shared/infrastructure/messaging/event-bus.service';
import { AuthService } from '../../../auth/infrastructure/service/auth.service';
import { ToastService } from '../../../shared/presentation/service/toast.service';
import { API_BASE_URL, DEFAULT_API_BASE_URL } from '../../../shared/infrastructure/api/api.config';
import { DeviceType } from '../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';
import type { BuildingCreatedEvent } from '../../domain/event/building-created.event';
import type { DeviceAddedEvent } from '../../domain/event/device-added.event';
import type { ConsumptionChangedEvent } from '../../domain/event/consumption-changed.event';
import type { ProductionChangedEvent } from '../../domain/event/production-changed.event';

interface MockStompClient {
  config: { connectHeaders?: Record<string, string> };
  onConnect?: () => void;
  onStompError?: (frame: { headers: Record<string, string>; body: string }) => void;
  activate: jest.Mock;
  deactivate: jest.Mock;
  subscribe: jest.Mock;
}

const mockInstances: MockStompClient[] = [];

jest.mock('@stomp/stompjs', () => {
  class MockClient {
    config: unknown;
    onConnect?: () => void;
    onStompError?: (frame: { headers: Record<string, string>; body: string }) => void;
    activate = jest.fn(() => this.onConnect?.());
    deactivate = jest.fn();
    subscribe = jest.fn();

    constructor(config: unknown) {
      this.config = config;
      mockInstances.push(this as unknown as MockStompClient);
    }
  }
  return { Client: MockClient };
});

jest.mock('sockjs-client', () => jest.fn().mockImplementation(() => ({})));

describe('BuildingWebSocketService', () => {
  let service: BuildingWebSocketService;
  let eventBus: EventBusService;
  let authService: AuthService;
  let toastService: ToastService;

  const BUILDING_ID = 'b-1';

  beforeEach(() => {
    mockInstances.length = 0;

    TestBed.configureTestingModule({
      providers: [
        BuildingWebSocketService,
        EventBusService,
        AuthService,
        { provide: API_BASE_URL, useValue: DEFAULT_API_BASE_URL },
      ],
    });

    service = TestBed.inject(BuildingWebSocketService);
    eventBus = TestBed.inject(EventBusService);
    authService = TestBed.inject(AuthService);
    toastService = TestBed.inject(ToastService);
  });

  it('creates a STOMP client with an Authorization header when a token is present', () => {
    authService.setToken('jwt-token', 'VIEWER');

    service.connect(BUILDING_ID);

    expect(mockInstances).toHaveLength(1);
    expect(mockInstances[0].config).toEqual(
      expect.objectContaining({
        connectHeaders: { Authorization: 'Bearer jwt-token' },
      }),
    );
    expect(mockInstances[0].activate).toHaveBeenCalled();
  });

  it('creates a STOMP client with no Authorization header when unauthenticated', () => {
    service.connect(BUILDING_ID);

    expect(mockInstances[0].config).toEqual(
      expect.objectContaining({ connectHeaders: {} }),
    );
  });

  it('subscribes to /topic/buildings plus the 3 per-building topics when a buildingId is passed', () => {
    service.connect(BUILDING_ID);

    const client = mockInstances[0];
    const topics = client.subscribe.mock.calls.map(call => call[0]);

    expect(topics).toEqual([
      '/topic/buildings',
      `/topic/buildings/${BUILDING_ID}/consumption`,
      `/topic/buildings/${BUILDING_ID}/devices`,
      `/topic/buildings/${BUILDING_ID}/production`,
    ]);
  });

  it('subscribes only to /topic/buildings when no buildingId is passed', () => {
    service.connect();

    const client = mockInstances[0];
    const topics = client.subscribe.mock.calls.map(call => call[0]);

    expect(topics).toEqual(['/topic/buildings']);
  });

  it('bridges an incoming building-created message onto the EventBus and shows an info toast', done => {
    const showSpy = jest.spyOn(toastService, 'show');
    service.connect();

    eventBus.on<BuildingCreatedEvent>('BUILDING_CREATED').subscribe(event => {
      expect(event).toEqual({
        type: 'BUILDING_CREATED',
        buildingId: 'b-new',
        name: 'Library',
        location: 'Zone B',
      });
      expect(showSpy).toHaveBeenCalledWith('Building "Library" was added.', 'info');
      done();
    });

    const buildingCreatedHandler = mockInstances[0].subscribe.mock.calls[0][1];
    buildingCreatedHandler({
      body: JSON.stringify({ buildingId: 'b-new', name: 'Library', location: 'Zone B' }),
    });
  });

  it('bridges an incoming consumption message onto the EventBus and shows an info toast', done => {
    const showSpy = jest.spyOn(toastService, 'show');
    service.connect(BUILDING_ID);

    eventBus.on<ConsumptionChangedEvent>('CONSUMPTION_CHANGED').subscribe(event => {
      expect(event.buildingId).toBe(BUILDING_ID);
      expect(event.oldConsumption.value).toBe(10);
      expect(event.newConsumption.value).toBe(20);
      expect(showSpy).toHaveBeenCalledWith('Consumption was updated.', 'info');
      done();
    });

    const consumptionHandler = mockInstances[0].subscribe.mock.calls[1][1];
    consumptionHandler({
      body: JSON.stringify({
        buildingId: BUILDING_ID,
        oldValue: 10,
        oldUnit: EnergyUnit.kW,
        newValue: 20,
        newUnit: EnergyUnit.kW,
      }),
    });
  });

  it('bridges an incoming device-added message onto the EventBus and shows an info toast', done => {
    const showSpy = jest.spyOn(toastService, 'show');
    service.connect(BUILDING_ID);

    eventBus.on<DeviceAddedEvent>('DEVICE_ADDED').subscribe(event => {
      expect(event).toEqual({
        type: 'DEVICE_ADDED',
        buildingId: BUILDING_ID,
        deviceId: 'd-1',
        deviceType: DeviceType.SOLAR,
      });
      expect(showSpy).toHaveBeenCalledWith(`A ${DeviceType.SOLAR} device was added.`, 'info');
      done();
    });

    const deviceAddedHandler = mockInstances[0].subscribe.mock.calls[2][1];
    deviceAddedHandler({
      body: JSON.stringify({ buildingId: BUILDING_ID, deviceId: 'd-1', deviceType: DeviceType.SOLAR }),
    });
  });

  it('bridges an incoming production message onto the EventBus and shows an info toast', done => {
    const showSpy = jest.spyOn(toastService, 'show');
    service.connect(BUILDING_ID);

    eventBus.on<ProductionChangedEvent>('PRODUCTION_CHANGED').subscribe(event => {
      expect(event.buildingId).toBe(BUILDING_ID);
      expect(event.deviceId).toBe('d-1');
      expect(event.oldProduction.value).toBe(30);
      expect(event.newProduction.value).toBe(50);
      expect(showSpy).toHaveBeenCalledWith('Device production was updated.', 'info');
      done();
    });

    const productionHandler = mockInstances[0].subscribe.mock.calls[3][1];
    productionHandler({
      body: JSON.stringify({
        buildingId: BUILDING_ID,
        deviceId: 'd-1',
        oldValue: 30,
        oldUnit: EnergyUnit.kW,
        newValue: 50,
        newUnit: EnergyUnit.kW,
      }),
    });
  });

  it('shows an error toast when the STOMP CONNECT is rejected', () => {
    const showSpy = jest.spyOn(toastService, 'show');
    service.connect(BUILDING_ID);

    mockInstances[0].onStompError?.({ headers: { message: 'Bad credentials' }, body: '' });

    expect(showSpy).toHaveBeenCalledWith(
      'Real-time updates unavailable: Bad credentials',
      'error',
    );
  });

  it('falls back to a generic reason when the STOMP error frame has no message header', () => {
    const showSpy = jest.spyOn(toastService, 'show');
    service.connect(BUILDING_ID);

    mockInstances[0].onStompError?.({ headers: {}, body: '' });

    expect(showSpy).toHaveBeenCalledWith(
      'Real-time updates unavailable: authentication failed',
      'error',
    );
  });

  it('does not show a duplicate toast on repeated STOMP errors from the same connection', () => {
    const showSpy = jest.spyOn(toastService, 'show');
    service.connect(BUILDING_ID);

    mockInstances[0].onStompError?.({ headers: { message: 'Bad credentials' }, body: '' });
    mockInstances[0].onStompError?.({ headers: { message: 'Bad credentials' }, body: '' });

    expect(showSpy).toHaveBeenCalledTimes(1);
  });

  it('allows the toast again after a fresh connect() call', () => {
    const showSpy = jest.spyOn(toastService, 'show');
    service.connect(BUILDING_ID);
    mockInstances[0].onStompError?.({ headers: { message: 'Bad credentials' }, body: '' });

    service.connect(BUILDING_ID);
    mockInstances[1].onStompError?.({ headers: { message: 'Bad credentials' }, body: '' });

    expect(showSpy).toHaveBeenCalledTimes(2);
  });

  it('deactivates the STOMP client on disconnect', () => {
    service.connect(BUILDING_ID);
    service.disconnect();

    expect(mockInstances[0].deactivate).toHaveBeenCalled();
  });

  it('deactivates any existing client before creating a new one on repeated connect() calls', () => {
    service.connect('b-1');
    service.connect('b-2');

    expect(mockInstances).toHaveLength(2);
    expect(mockInstances[0].deactivate).toHaveBeenCalled();
  });

  it('does not create a STOMP client during SSR/prerender', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        BuildingWebSocketService,
        EventBusService,
        AuthService,
        { provide: API_BASE_URL, useValue: DEFAULT_API_BASE_URL },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    TestBed.inject(BuildingWebSocketService).connect(BUILDING_ID);

    expect(mockInstances).toHaveLength(0);
  });
});
