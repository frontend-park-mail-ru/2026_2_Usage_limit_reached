import { createHash } from 'node:crypto';

/** Добавляет в worker список ресурсов и версию из окончательных файлов сборки. */
export class ServiceWorkerAssetsPlugin {
  apply(compiler) {
    const { Compilation, sources } = compiler.webpack;
    compiler.hooks.thisCompilation.tap('ServiceWorkerAssetsPlugin', (compilation) => {
      compilation.hooks.processAssets.tap({
        name: 'ServiceWorkerAssetsPlugin',
        stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
      }, () => {
        const worker = compilation.getAsset('sw.js');
        const assets = compilation.getAssets()
          .filter(({ name }) => name !== 'sw.js' && /\.(html|js|css|svg|png|jpe?g|webp|gif|ico|woff2?)$/.test(name))
          .sort((left, right) => left.name.localeCompare(right.name))
          .map(({ name, source }) => ({
            url: '/' + name,
            revision: createHash('sha256').update(source.buffer()).digest('hex'),
          }));
        const version = createHash('sha256')
          .update(JSON.stringify(assets))
          .update(worker.source.buffer())
          .digest('hex');
        compilation.updateAsset('sw.js', new sources.ConcatSource(
          'const __APP_PRECACHE__ = ' + JSON.stringify({ version, assets }) + ';\n',
          worker.source,
        ));
      });
    });
  }
}
