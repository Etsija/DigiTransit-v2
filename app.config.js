const appJson = require('./app.json');

const androidGoogleMapsApiKey = process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY;
const baseExpoConfig = appJson.expo;

const plugins = (baseExpoConfig.plugins ?? []).filter((plugin) => {
  if (typeof plugin === 'string') {
    return plugin !== 'react-native-maps';
  }

  return plugin[0] !== 'react-native-maps';
});

if (androidGoogleMapsApiKey) {
  plugins.push([
    'react-native-maps',
    {
      androidGoogleMapsApiKey,
    },
  ]);
}

module.exports = {
  expo: {
    ...baseExpoConfig,
    plugins,
  },
};
