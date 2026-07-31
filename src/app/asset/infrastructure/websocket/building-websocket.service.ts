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
import { BuildingDeletedEvent } from '../../domain/event/building-deleted.event';
import { ConsumptionChangedEvent } from '../../domain/event/consumption-changed.event';
import { DeviceAddedEvent } from '../../domain/event/device-added.event';
import { DeviceRemovedEvent } from '../../domain/event/device-removed.event';
import { ProductionChangedEvent } from '../../domain/event/production-changed.event';
import { AuthService } from '../../../auth/infrastructure/service/auth.service';
import { API_BASE_URL } from '../../../shared/infrastructure/api/api.config';
import { BuildingRealtimeGateway } from '../../domain/gateway/building-realtime.gateway';
import { ToastService } from '../../../shared/presentation/service/toast.service';

export interface BuildingCreatedMessage {
  buildingId: string;
  name: string;
  location: string;
}

export interface BuildingDeletedMessage {
  buildingId: string;
  name: string;
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

export interface DeviceRemovedMessage {
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
 *   /topic/buildings                              — building creation (collection-level;
 *                                                    always subscribed, no buildingId needed)
 *   /topic/buildings/deleted                      — building deletion (collection-level;
 *                                                    always subscribed, no buildingId needed)
 *   /topic/buildings/{buildingId}/consumption     — consumption change updates (per building)
 *   /topic/buildings/{buildingId}/devices         — device addition updates (per building)
 *   /topic/buildings/{buildingId}/devices/removed — device removal updates (per building)
 *   /topic/buildings/{buildingId}/production      — device production change updates (per building)
 */
@Injectable()
export class BuildingWebSocketService extends BuildingRealtimeGateway {
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly buildingCreated$ = new Subject<BuildingCreatedMessage>();
  private readonly buildingDeleted$ = new Subject<BuildingDeletedMessage>();
  private readonly consumptionUpdates$ = new Subject<ConsumptionUpdateMessage>();
  private readonly deviceAdded$ = new Subject<DeviceAddedMessage>();
  private readonly deviceRemoved$ = new Subject<DeviceRemovedMessage>();
  private readonly productionUpdates$ = new Subject<ProductionUpdateMessage>();

  private client: Client | null = null;
  // Guards against a toast per reconnect attempt — reconnectDelay retries every 5s,
  // and an expired/invalid token would otherwise fail every single retry.
  private hasShownConnectionErrorToast = false;

  constructor(
    private readonly eventBus: EventBusService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
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
      this.toastService.show(`Building "${msg.name}" was added.`, 'info');
      this.eventBus.publish(event);
    });

    this.buildingDeleted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(msg => {
      const event: BuildingDeletedEvent = {
        type: 'BUILDING_DELETED',
        buildingId: msg.buildingId,
        name: msg.name,
      };
      this.toastService.show(`Building "${msg.name}" was deleted.`, 'info');
      this.eventBus.publish(event);
    });

    this.consumptionUpdates$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(msg => {
      const event: ConsumptionChangedEvent = {
        type: 'CONSUMPTION_CHANGED',
        buildingId: msg.buildingId,
        oldConsumption: new Energy(msg.oldValue, msg.oldUnit),
        newConsumption: new Energy(msg.newValue, msg.newUnit),
      };
      this.toastService.show('Consumption was updated.', 'info');
      this.eventBus.publish(event);
    });

    this.deviceAdded$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(msg => {
      const event: DeviceAddedEvent = {
        type: 'DEVICE_ADDED',
        buildingId: msg.buildingId,
        deviceId: msg.deviceId,
        deviceType: msg.deviceType,
      };
      this.toastService.show(`A ${msg.deviceType} device was added.`, 'info');
      this.eventBus.publish(event);
    });

    this.deviceRemoved$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(msg => {
      const event: DeviceRemovedEvent = {
        type: 'DEVICE_REMOVED',
        buildingId: msg.buildingId,
        deviceId: msg.deviceId,
        deviceType: msg.deviceType,
      };
      this.toastService.show(`A ${msg.deviceType} device was removed.`, 'info');
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
      this.toastService.show('Device production was updated.', 'info');
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
    this.hasShownConnectionErrorToast = false;

    const token = this.authService.getToken();

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${this.apiBaseUrl}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
    });

    // STOMP CONNECT is rejected by the backend's StompAuthChannelInterceptor when the
    // token is missing, expired, or revoked — surface that once rather than silently
    // retrying forever (reconnectDelay keeps retrying, so this would otherwise fire
    // again every 5s).
    this.client.onStompError = frame => {
      if (this.hasShownConnectionErrorToast) return;
      this.hasShownConnectionErrorToast = true;
      const reason = frame.headers['message'] ?? 'authentication failed';
      this.toastService.show(`Real-time updates unavailable: ${reason}`, 'error');
    };

    this.client.onConnect = () => {
      this.client?.subscribe('/topic/buildings', message => {
        this.buildingCreated$.next(JSON.parse(message.body));
      });

      this.client?.subscribe('/topic/buildings/deleted', message => {
        this.buildingDeleted$.next(JSON.parse(message.body));
      });

      if (!buildingId) return;

      this.client?.subscribe(`/topic/buildings/${buildingId}/consumption`, message => {
        this.consumptionUpdates$.next(JSON.parse(message.body));
      });

      this.client?.subscribe(`/topic/buildings/${buildingId}/devices`, message => {
        this.deviceAdded$.next(JSON.parse(message.body));
      });

      this.client?.subscribe(`/topic/buildings/${buildingId}/devices/removed`, message => {
        this.deviceRemoved$.next(JSON.parse(message.body));
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
