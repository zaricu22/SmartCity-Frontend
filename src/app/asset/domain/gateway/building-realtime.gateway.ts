// Abstract class used as Angular DI token — mirrors PublicBuildingRepository (ADR-0002)
// for a non-persistence infrastructure concern. Infrastructure implements real-time
// delivery (WebSocket today); presentation reaches it only through the Facade (ADR-0008).
export abstract class BuildingRealtimeGateway {
  abstract connect(buildingId?: string): void;
  abstract disconnect(): void;
}
