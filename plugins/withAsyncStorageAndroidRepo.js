const { createRunOncePlugin, withProjectBuildGradle } = require('@expo/config-plugins');

const ASYNC_STORAGE_MAVEN_REPO =
  'maven { url("$rootDir/../node_modules/@react-native-async-storage/async-storage/android/local_repo") }';

function addAsyncStorageRepo(src) {
  if (src.includes(ASYNC_STORAGE_MAVEN_REPO)) {
    return src;
  }

  const updated = src.replace(
    /allprojects\s*\{\s*repositories\s*\{/m,
    (match) => `${match}\n        ${ASYNC_STORAGE_MAVEN_REPO}`
  );

  if (updated === src) {
    throw new Error(
      'Failed to add Async Storage local Maven repo to android/build.gradle because the allprojects repositories block was not found.'
    );
  }

  return updated;
}

function withAsyncStorageAndroidRepo(config) {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = addAsyncStorageRepo(config.modResults.contents);
    return config;
  });
}

module.exports = createRunOncePlugin(
  withAsyncStorageAndroidRepo,
  'with-async-storage-android-repo',
  '1.0.0'
);
