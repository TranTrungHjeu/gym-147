const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for font files
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

// Configure transformer to handle fonts
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;
