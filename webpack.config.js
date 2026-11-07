import path from 'node:path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { SRC_DIR, DIST_DIR, COMPONENTS_DIR } from './webpack.constants.js';

/**
 * @param partial
 * @param callback
 */
function resolvePartial(partial, callback) {
  callback(null, path.join(COMPONENTS_DIR, partial, `${partial}.hbs`));
}

export default {
  entry: path.join(SRC_DIR, 'main.ts'),
  output: {
    path: DIST_DIR,
    filename: '[name].[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.hbs$/,
        loader: 'handlebars-loader',
        options: { partialResolver: resolvePartial },
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              url: { filter: (url) => !url.startsWith('/') },
            },
          },
          'postcss-loader',
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: path.join(SRC_DIR, 'index.html') }),
    new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
    new CopyWebpackPlugin({ patterns: [{ from: path.join(SRC_DIR, 'assets'), to: 'assets' }] }),
  ],
  devServer: {
    port: 3000,
    historyApiFallback: true,
  },
};
