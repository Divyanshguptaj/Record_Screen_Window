const path = require('path');

const common = {
  mode: 'development',
  module: {
    rules: [{ test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ }],
  },
  resolve: { extensions: ['.ts', '.js'] },
  output: { path: path.resolve(__dirname, 'dist') },
};

module.exports = [
  // Main process
  {
    ...common,
    entry: './src/main/main.ts',
    target: 'electron-main',
    output: { ...common.output, filename: 'main.js' },
  },
  // Preload script (must be compiled separately)
  {
    ...common,
    entry: './src/main/preload.ts',
    target: 'electron-preload',
    output: { ...common.output, filename: 'preload.js' },
  },
];
