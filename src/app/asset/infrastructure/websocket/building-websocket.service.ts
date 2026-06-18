import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';
import { DeviceType } from '../../domain/shared/enums/device-type.enum';
import { EventBusService } from '../../../shared/infrastructure/messaging/event-bus.service';
import { Energy } from '../../domain/value-object/energy';
import { ConsumptionChangedEvent } from '../../domain/event/consumption-changed.event';
import { DeviceAddedEvent } from '../../domain/event/device-added.event';
import { ProductionChangedEvent } from '../../domain/event/production-changed.event';

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
  newValue: number;
  newUnit: EnergyUnit;
}

/**
 * WebSocket client — subscribes to domain event topics pushed by the backend.
 *
 * Topics (STOMP):
 *   /topic/buildings/{buildingId}/consumption  — consumption change updates
 *   /topic/buildings/{buildingId}/devices      — device addition updates
 *   /topic/buildings/{buildingId}/production   — device production change updates
 *
 * Requires @stomp/stompjs or sockjs-client to be installed.
 * Stub implementation — replace the connect() body with real STOMP wiring.
 */
@Injectable()
export class BuildingWebSocketService implements OnDestroy {
  private readonly consumptionUpdates$ = new Subject<ConsumptionUpdateMessage>();
  private readonly deviceAdded$ = new Subject<DeviceAddedMessage>();
  private readonly productionUpdates$ = new Subject<ProductionUpdateMessage>();

  private client: any; // replace with Client from @stomp/stompjs

  constructor(private readonly eventBus: EventBusService) {
    // Wired in the constructor — service is eager; the bridge must be active the moment the service is injected.
    // Bridge incoming WebSocket messages into the event bus so any component
    // can react without knowing about the WebSocket transport.
    this.consumptionUpdates$.subscribe(msg => {
      const event: ConsumptionChangedEvent = {
        type: 'CONSUMPTION_CHANGED',
        buildingId: msg.buildingId,
        oldConsumption: new Energy(msg.oldValue, msg.oldUnit),
        newConsumption: new Energy(msg.newValue, msg.newUnit),
      };
      this.eventBus.publish(event);
    });

    this.deviceAdded$.subscribe(msg => {
      const event: DeviceAddedEvent = {
        type: 'DEVICE_ADDED',
        buildingId: msg.buildingId,
        deviceId: msg.deviceId,
        deviceType: msg.deviceType,
      };
      this.eventBus.publish(event);
    });

    this.productionUpdates$.subscribe(msg => {
      const event: ProductionChangedEvent = {
        type: 'PRODUCTION_CHANGED',
        buildingId: msg.buildingId,
        deviceId: msg.deviceId,
        newProduction: new Energy(msg.newValue, msg.newUnit),
      };
      this.eventBus.publish(event);
    });
  }

  connect(): void {
    // TODO: wire real STOMP client
    // this.client = new Client({ brokerURL: `${API_BASE_URL}/ws` });
    // this.client.onConnect = () => {
    //   this.client.subscribe(`/topic/buildings/${buildingId}/consumption`, msg => {
    //     this.consumptionUpdates$.next(JSON.parse(msg.body));
    //   });
    //   this.client.subscribe(`/topic/buildings/${buildingId}/devices`, msg => {
    //     this.deviceAdded$.next(JSON.parse(msg.body));
    //   });
    //   this.client.subscribe(`/topic/buildings/${buildingId}/production`, msg => {
    //     this.productionUpdates$.next(JSON.parse(msg.body));
    //   });
    // };
    // this.client.activate();
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

  ngOnDestroy(): void {
    this.client?.deactivate();
  }
}
