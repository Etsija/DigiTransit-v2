import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import { MapScreen } from '@/features/map/map-screen';
import { buildStopHref } from '@/types/navigation';

export default function MapRoute() {
  const isFocused = useIsFocused();
  const router = useRouter();

  return (
    <MapScreen
      isActive={isFocused}
      onSelectStop={(stopId) => {
        router.push(buildStopHref(stopId));
      }}
    />
  );
}
