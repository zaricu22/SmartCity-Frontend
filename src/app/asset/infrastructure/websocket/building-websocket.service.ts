import { DestroyRef, Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';
import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';
import { DeviceType } from '../../domain/shared/enums/device-type.enum';
import { EventBusService } from '../../../shared/infrastructure/messaging/event-bus.service';
import { Energy } from '../../domain/value-object/energy';
import { ConsumptionChangedEvent } from '../../domain/event/consumption-changed.event';
import { DeviceAddedEvent } from '../../domain/event/device-added.event';
import { ProductionChangedEvent } from '../../domain/event/production-changed.event';
import { AuthService } from '../../../auth/infrastructure/service/auth.service';
import { API_BASE_URL } from '../../../shared/infrastructure/api/api.config';
import { BuildingRealtimeGateway } from '../../domain/gateway/building-realtime.gateway';

export interface ConsumptionUpdateMessage {
  buildingId: string;
  oldValue: number;
  oldUnit: EnergyUnit;
  newValue: number;
  newUnit: EnergyUnit;
}

export interface DeviceAddedMessage {
  buildingId: string;
  deviceId: string;
  deviceType: DeviceType;
}

export interface ProductionUpdateMessage {
  buildingId: string;
  deviceId: string;
  oldValue: number;
  oldUnit: EnergyUnit;
  newValue: number;
  newUnit: EnergyUnit;
}

/**
 * WebSocket client — subscribes to domain event topics pushed by the backend
 * for a single building.
 *
 * Topics (STOMP), scoped per buildingId passed to connect():
 *   /topic/buildings/{buildingId}/consumption  — consumption change updates
 *   /topic/buildings/{buildingId}/devices      — device addition updates
 *   /topic/buildings/{buildingId}/production   — device production change updates
 */
@Injectable()
export class BuildingWebSocketService extends BuildingRealtimeGateway {
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly consumptionUpdates$ = new Subject<ConsumptionUpdateMessage>();
  private readonly deviceAdded$ = new Subject<DeviceAddedMessage>();
  private readonly productionUpdates$ = new Subject<ProductionUpdateMessage>();

  private client: Client | null = null;

  constructor(
    private readonly eventBus: EventBusService,
    private readonly authService: AuthService,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string,
  ) {
    super();
    // Wired in the constructor — service is eager; the bridge must be active the moment the service is injected.
    // Bridge incoming WebSocket messages into the event bus so any component
    // can react without knowing about the WebSocket transport.
    this.consumptionUpdates$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(msg => {
      const event: ConsumptionChangedEvent = {
        type: 'CONSUMPTION_CHANGED',
        buildingId: msg.buildingId,
        oldConsumption: new Energy(msg.oldValue, msg.oldUnit),
        newConsumption: new Energy(msg.newValue, msg.newUnit),
      };
      this.eventBus.publish(event);
    });

    this.deviceAdded$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(msg => {
      const event: DeviceAddedEvent = {
        type: 'DEVICE_ADDED',
        buildingId: msg.buildingId,
        deviceId: msg.deviceId,
        deviceType: msg.deviceType,
      };
      this.eventBus.publish(event);
    });

    this.productionUpdates$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(msg => {
      const event: ProductionChangedEvent = {
        type: 'PRODUCTION_CHANGED',
        buildingId: msg.buildingId,
        deviceId: msg.deviceId,
        oldProduction: new Energy(msg.oldValue, msg.oldUnit),
        newProduction: new Energy(msg.newValue, msg.newUnit),
      };
      this.eventBus.publish(event);
    });

    // Service is provided at route level (ASSET_PROVIDERS) — deactivate the STOMP
    // client when the building-detail route is left, same lifecycle as the Subjects above.
    this.destroyRef.onDestroy(() => this.disconnect());
  }

  connect(buildingId: string): void {
    // SockJS/STOMP need browser transports (XHR, WebSocket) that don't exist during
    // Angular Universal SSR/prerender — connecting there would throw in Node.
    if (!this.isBrowser) return;

    const token = this.authService.getToken();

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${this.apiBaseUrl}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
    });

    this.client.onConnect = () => {
      this.client?.subscribe(`/topic/buildings/${buildingId}/consumption`, message => {
        this.consumptionUpdates$.next(JSON.parse(message.body));
      });

      this.client?.subscribe(`/topic/buildings/${buildingId}/devices`, message => {
        this.deviceAdded$.next(JSON.parse(message.body));
      });

      this.client?.subscribe(`/topic/buildings/${buildingId}/production`, message => {
        this.productionUpdates$.next(JSON.parse(message.body));
      });
    };

    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
  }

  consumptionUpdates(): Observable<ConsumptionUpdateMessage> {
    return this.consumptionUpdates$.asObservable();
  }

  deviceAdded(): Observable<DeviceAddedMessage> {
    return this.deviceAdded$.asObservable();
  }

  productionUpdates(): Observable<ProductionUpdateMessage> {
    return this.productionUpdates$.asObservable();
  }
}
