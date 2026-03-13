import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

type Coordinates = {
  latitude: number;
  longitude: number;
};

export type NearbyStopsSourceState = {
  mode: 'live' | 'detached';
  detachedCenter: Coordinates | null;
  detachedQueryCoordinates: Coordinates | null;
  startDetached: (coordinates: Coordinates) => void;
  setDetachedCenter: (coordinates: Coordinates) => void;
  confirmDetachedQuery: () => void;
  returnToLive: () => void;
};

const initialNearbyStopsSourceState = {
  mode: 'live',
  detachedCenter: null,
  detachedQueryCoordinates: null,
} satisfies Pick<NearbyStopsSourceState, 'mode' | 'detachedCenter' | 'detachedQueryCoordinates'>;

const nearbyStopsSourceStore = createStore<NearbyStopsSourceState>()((set, get) => ({
  ...initialNearbyStopsSourceState,
  startDetached: (coordinates) =>
    set((state) =>
      state.mode === 'detached'
        ? state
        : {
            ...state,
            mode: 'detached',
            detachedCenter: coordinates,
            detachedQueryCoordinates: null,
          }
    ),
  setDetachedCenter: (coordinates) =>
    set((state) => ({
      ...state,
      mode: 'detached',
      detachedCenter: coordinates,
    })),
  confirmDetachedQuery: () =>
    set((state) =>
      state.detachedCenter
        ? {
            ...state,
            detachedQueryCoordinates: state.detachedCenter,
          }
        : state
    ),
  returnToLive: () =>
    set(() => ({
      ...initialNearbyStopsSourceState,
    })),
}));

export function useNearbyStopsSourceStore<T>(selector: (state: NearbyStopsSourceState) => T): T {
  return useStore(nearbyStopsSourceStore, selector);
}

export function getNearbyStopsSourceStore() {
  return nearbyStopsSourceStore;
}

export function __resetNearbyStopsSourceTestState() {
  nearbyStopsSourceStore.setState({
    ...initialNearbyStopsSourceState,
    startDetached: get().startDetached,
    setDetachedCenter: get().setDetachedCenter,
    confirmDetachedQuery: get().confirmDetachedQuery,
    returnToLive: get().returnToLive,
  });
}

function get() {
  return nearbyStopsSourceStore.getState();
}
