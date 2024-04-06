import extract from 'extract-zip';
import fsP from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { glob, globSync, globStream, globStreamSync, Glob } from 'glob';
import { getGlobals } from 'common-es';
import replace from 'replace-in-file';
import archiver from 'archiver';
const { __dirname } = getGlobals(import.meta.url);
const jwtRegex = /Bearer\s+([a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?)/g;
const zipDirectory = (sourceDir, outPath) => {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on('error', (err) => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });
};
async function main() {
  try {
    const traceFiles = await glob('./{playwright-report,test-results}/**/*.zip', { ignore: 'node_modules/**' });
    const promises = traceFiles.map(async (file) => {
      const fileDir = path.dirname(file);
      const fileName = path.basename(file).split('.')[0];

      const target = path.join(__dirname, fileDir, fileName);
      if (!fs.existsSync(target)) {
        await fsP.mkdir(target);
      }
      await extract(file, { dir: target });
      await fsP.rm(file, { recursive: true });
      replace.sync({
        files: path.join(target, '**/*'),
        from: jwtRegex,
        to: '<redacted>',
      });
      await zipDirectory(target, file);
      await fsP.rm(target, { recursive: true });
    });
    await Promise.allSettled(promises);
  } catch (err) {
    // handle any errors
  }
}

main();
