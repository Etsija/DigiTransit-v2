import { reverseGeocodeAsync } from 'expo-location';
import { useEffect, useRef, useState } from 'react';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type UseReverseGeocodeResult = {
  address: string | undefined;
};

const MIN_DISTANCE_METERS = 50;
const MIN_INTERVAL_MS = 5000;

function haversineDistanceMeters(a: Coordinates, b: Coordinates) {
  const R = 6_371_000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinLon *
      sinLon;

  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function formatGeocodedAddress(result: {
  street?: string | null;
  streetNumber?: string | null;
  city?: string | null;
  name?: string | null;
}): string | undefined {
  const street = result.street;
  const number = result.streetNumber;
  const city = result.city;

  if (street && number && city) {
    return `${street} ${number}, ${city}`;
  }

  if (street && city) {
    return `${street}, ${city}`;
  }

  if (street) {
    return street;
  }

  if (result.name) {
    return result.name;
  }

  return undefined;
}

export function useReverseGeocode(coordinates: Coordinates | null): UseReverseGeocodeResult {
  const [address, setAddress] = useState<string | undefined>(undefined);
  const lastGeocodedCoordsRef = useRef<Coordinates | null>(null);
  const lastGeocodedAtRef = useRef(0);

  useEffect(() => {
    if (!coordinates) {
      setAddress(undefined);
      lastGeocodedCoordsRef.current = null;
      return;
    }

    const now = Date.now();
    const lastCoords = lastGeocodedCoordsRef.current;

    if (lastCoords) {
      const distance = haversineDistanceMeters(lastCoords, coordinates);
      const elapsed = now - lastGeocodedAtRef.current;

      if (distance < MIN_DISTANCE_METERS && elapsed < MIN_INTERVAL_MS) {
        return;
      }
    }

    let cancelled = false;
    lastGeocodedCoordsRef.current = coordinates;
    lastGeocodedAtRef.current = now;

    void (async () => {
      try {
        const results = await reverseGeocodeAsync(coordinates);

        if (cancelled) {
          return;
        }

        const formatted = results[0] ? formatGeocodedAddress(results[0]) : undefined;
        setAddress(formatted);
      } catch {
        if (!cancelled) {
          setAddress(undefined);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coordinates]);

  return { address };
}
