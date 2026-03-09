import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import { StopsScreen } from '@/features/stops/stops-screen';
import { buildStopHref } from '@/types/navigation';

export default function StopsRoute() {
  const isFocused = useIsFocused();
  const router = useRouter();

  return (
    <StopsScreen
      isActive={isFocused}
      onStopPress={(stopId) => {
        router.push(buildStopHref(stopId));
      }}
    />
  );
}
