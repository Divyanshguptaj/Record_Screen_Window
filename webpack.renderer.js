const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map', // avoids eval(), which CSP blocks
  entry: './src/renderer/index.tsx',
  target: 'electron-renderer',
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  resolve: { extensions: ['.tsx', '.ts', '.js'] },
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'renderer.js',
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/renderer/index.html' }),
  ],
};
