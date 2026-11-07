import path from 'node:path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';
import { ServiceWorkerAssetsPlugin } from './webpack.service-worker.js';
import { SRC_DIR, DIST_DIR, COMPONENTS_DIR } from './webpack.constants.js';
import { CONTENT_SECURITY_POLICY } from './webpack.csp.js';

/**
 * @param partial
 * @param callback
 */
function resolvePartial(partial, callback) {
  callback(null, path.join(COMPONENTS_DIR, partial, `${partial}.hbs`));
}

export default (_env, argv) => ({
  entry: {
    main: path.join(SRC_DIR, 'main.ts'),
    sw: path.join(SRC_DIR, 'worker', 'service-worker.ts'),
  },
  output: {
    path: DIST_DIR,
    filename: ({ chunk }) => chunk.name === 'sw' ? 'sw.js' : '[name].[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  devtool: 'source-map',
  resolve: {
    alias: { '@': SRC_DIR },
  },
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
    new webpack.DefinePlugin({ __SERVICE_WORKER_ENABLED__: JSON.stringify(argv.mode === 'production') }),
    new HtmlWebpackPlugin({
      template: path.join(SRC_DIR, 'index.html'),
      chunks: ['main'],
      templateParameters: {
        contentSecurityPolicy: argv.mode === 'production' ? CONTENT_SECURITY_POLICY : '',
      },
    }),
    new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
    new CopyWebpackPlugin({ patterns: [{ from: path.join(SRC_DIR, 'assets'), to: 'assets' }] }),
    new ServiceWorkerAssetsPlugin(),
  ],
  devServer: {
    port: 3000,
    historyApiFallback: true,
  },
});
