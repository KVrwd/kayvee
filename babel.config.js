// With Expo + babel-preset-expo, the Reanimated 4 / react-native-worklets
// Babel plugin is wired up automatically - do not add it manually here,
// that would double-transform worklets and cause hard-to-debug crashes.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
