const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure SVG transformer
config.transformer.babelTransformerPath = require.resolve(
  'react-native-svg-transformer'
);

// Add SVG to source extensions and remove from asset extensions
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== 'svg'
);
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// Add support for font files
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

// Configure transformer to handle fonts
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;
