import { Redirect } from 'expo-router';
import React from 'react';

import { ShowcaseScreen } from '@/features/showcase/showcase-screen';

export default function ShowcaseRoute() {
  if (!__DEV__) {
    return <Redirect href='/settings' />;
  }

  return <ShowcaseScreen />;
}
