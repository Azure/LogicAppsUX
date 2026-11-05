// @ts-check
/* global require, module */
'use strict';

const createExtensionConfig = require('./webpack.extension.config');

/** @type {import('webpack').ConfigurationFactory} */
module.exports = (environment, arguments_) => ({
  ...createExtensionConfig(environment, arguments_),
  entry: {
    embedded: './src/embeddedMapper.ts',
    compilerHost: './src/worker/compilerHost.ts',
  },
});
