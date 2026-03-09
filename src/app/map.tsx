import { useIsFocused } from '@react-navigation/native';

import { MapScreen } from '@/features/map/map-screen';

export default function MapRoute() {
  const isFocused = useIsFocused();

  return <MapScreen isActive={isFocused} />;
}
