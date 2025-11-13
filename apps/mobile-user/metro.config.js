const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

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

// Monorepo configuration
// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Resolve packages from the workspace - prioritize react-native field for source files
// This allows Metro to use TypeScript source files from packages instead of built dist files
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
