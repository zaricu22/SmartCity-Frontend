import { DestroyRef, Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';
import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';
import { DeviceType } from '../../domain/shared/enums/device-type.enum';
import { EventBusService } from '../../../shared/infrastructure/messaging/event-bus.service';
import { Energy } from '../../domain/value-object/energy';
import { BuildingCreatedEvent } from '../../domain/event/building-created.event';
import { ConsumptionChangedEvent } from '../../domain/event/consumption-changed.event';
import { DeviceAddedEvent } from '../../domain/event/device-added.event';
import { ProductionChangedEvent } from '../../domain/event/production-changed.event';
import { AuthService } from '../../../auth/infrastructure/service/auth.service';
import { API_BASE_URL } from '../../../shared/infrastructure/api/api.config';
import { BuildingRealtimeGateway } from '../../domain/gateway/building-realtime.gateway';

export interface BuildingCreatedMessage {
  buildingId: string;
  name: string;
  location: string;
}

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
 * WebSocket client — subscribes to domain event topics pushed by the backend.
 *
 * The service is provided once for the whole `/assets` route subtree (parent-route
 * provider, shared between BuildingListComponent and BuildingDetailComponent — see
 * app.routes.ts), not per-page. Each page therefore owns its own connect()/disconnect()
 * call pair rather than relying on this service's own destruction.
 *
 * Topics (STOMP):
 *   /topic/buildings                           — building creation (collection-level;
 *                                                 always subscribed, no buildingId needed)
 *   /topic/buildings/{buildingId}/consumption  — consumption change updates (per building)
 *   /topic/buildings/{buildingId}/devices      — device addition updates (per building)
 *   /topic/buildings/{buildingId}/production   — device production change updates (per building)
 */
@Injectable()
export class BuildingWebSocketService extends BuildingRealtimeGateway {
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly buildingCreated$ = new Subject<BuildingCreatedMessage>();
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
    this.buildingCreated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(msg => {
      const event: BuildingCreatedEvent = {
        type: 'BUILDING_CREATED',
        buildingId: msg.buildingId,
        name: msg.name,
        location: msg.location,
      };
      this.eventBus.publish(event);
    });

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
  }

  /**
   * Connects and subscribes to the collection-level /topic/buildings topic. Pass
   * buildingId to also subscribe to that building's 3 per-building topics — used by
   * BuildingDetailComponent. Called without an argument (just /topic/buildings) by
   * BuildingListComponent. Safe to call repeatedly: any existing connection is torn
   * down first, since this service outlives any single page within /assets.
   */
  connect(buildingId?: string): void {
    // SockJS/STOMP need browser transports (XHR, WebSocket) that don't exist during
    // Angular Universal SSR/prerender — connecting there would throw in Node.
    if (!this.isBrowser) return;

    this.disconnect();

    const token = this.authService.getToken();

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${this.apiBaseUrl}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
    });

    this.client.onConnect = () => {
      this.client?.subscribe('/topic/buildings', message => {
        this.buildingCreated$.next(JSON.parse(message.body));
      });

      if (!buildingId) return;

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
}
