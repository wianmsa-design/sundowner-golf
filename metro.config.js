const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Only watch files inside the app directory, not parent directories
config.watchFolders = [__dirname];

// Block files outside app directory
config.resolver.blockList = [
  // Ignore read-excel.js in parent directory
  new RegExp(path.resolve(__dirname, '..', 'read-excel.js').replace(/\\/g, '\\\\')),
  // Ignore any .backup files
  /.*\.backup$/,
];

module.exports = config;
