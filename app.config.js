const appJson = require('./app.json');

const androidGoogleMapsApiKey = process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY;
const digitransitApiKey = process.env.EXPO_PUBLIC_DIGITRANSIT_API_KEY;
const digitransitApiUrl = process.env.EXPO_PUBLIC_DIGITRANSIT_API_URL;
const iosGoogleMapsApiKey = process.env.EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY;
const mapboxPublicToken = process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN;
const baseExpoConfig = appJson.expo;

const plugins = (baseExpoConfig.plugins ?? []).filter((plugin) => {
  if (typeof plugin === 'string') {
    return plugin !== 'react-native-maps';
  }

  return plugin[0] !== 'react-native-maps';
});

if (androidGoogleMapsApiKey || iosGoogleMapsApiKey) {
  plugins.push([
    'react-native-maps',
    {
      androidGoogleMapsApiKey,
      iosGoogleMapsApiKey,
    },
  ]);
}

module.exports = {
  expo: {
    ...baseExpoConfig,
    extra: {
      ...(baseExpoConfig.extra ?? {}),
      publicRuntimeConfig: {
        digitransitApiKey,
        digitransitApiUrl,
        iosGoogleMapsApiKey,
        mapboxPublicToken,
      },
    },
    plugins,
  },
};
