import { Provider } from '@angular/core';
import { PublicBuildingRepository } from './domain/repository/public-building.repository';
import { PublicBuildingApiService } from './infrastructure/api/service/public-building-api.service';
import { PublicBuildingAppService } from './application/service/public-building-app.service';
import { PublicBuildingQueryService } from './application/service/public-building-query.service';
import { PublicBuildingFacade } from './application/facade/public-building.facade';
import { BuildingWebSocketService } from './infrastructure/websocket/building-websocket.service';

// All providers for the asset bounded context — registered at feature route level
export const ASSET_PROVIDERS: Provider[] = [
  { provide: PublicBuildingRepository, useClass: PublicBuildingApiService },
  PublicBuildingAppService,
  PublicBuildingQueryService,
  PublicBuildingFacade,
  BuildingWebSocketService,
];
