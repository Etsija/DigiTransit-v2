import { Mode, TransitMode } from '@/generated/graphql';
import type { TransportMode } from '@/shared/theme/theme';

const MODE_TO_TRANSPORT_MODE: Partial<Record<Mode, TransportMode>> = {
  [Mode.Bus]: 'bus',
  [Mode.Coach]: 'bus',
  [Mode.Tram]: 'tram',
  [Mode.Rail]: 'train',
  [Mode.Monorail]: 'train',
  [Mode.Subway]: 'metro',
  [Mode.Ferry]: 'ferry',
};

const TRANSIT_MODE_TO_TRANSPORT_MODE: Partial<Record<TransitMode, TransportMode>> = {
  [TransitMode.Bus]: 'bus',
  [TransitMode.Coach]: 'bus',
  [TransitMode.Trolleybus]: 'bus',
  [TransitMode.Tram]: 'tram',
  [TransitMode.Rail]: 'train',
  [TransitMode.Monorail]: 'train',
  [TransitMode.Subway]: 'metro',
  [TransitMode.Ferry]: 'ferry',
};

const LEGACY_VEHICLE_TYPE_TO_TRANSPORT_MODE: Record<number, TransportMode> = {
  0: 'tram',
  1: 'metro',
  2: 'train',
  3: 'bus',
  4: 'ferry',
  11: 'bus',
  109: 'train',
  401: 'metro',
  402: 'train',
  403: 'bus',
  404: 'ferry',
};

export function mapGraphqlModeToTransportMode(mode: Mode | null | undefined): TransportMode | null {
  return mode ? MODE_TO_TRANSPORT_MODE[mode] ?? null : null;
}

export function mapGraphqlTransitModeToTransportMode(
  mode: TransitMode | null | undefined
): TransportMode | null {
  return mode ? TRANSIT_MODE_TO_TRANSPORT_MODE[mode] ?? null : null;
}

export function mapLegacyVehicleTypeToTransportMode(
  vehicleType: number | null | undefined
): TransportMode | null {
  return typeof vehicleType === 'number' ? LEGACY_VEHICLE_TYPE_TO_TRANSPORT_MODE[vehicleType] ?? null : null;
}
