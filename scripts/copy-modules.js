// copy-modules.mjs
import fs from 'fs';
import path from 'path';

const srcDir = path.resolve(
  process.cwd(),
  './scripts/wc4u',
);
const destDir = path.resolve(
  process.cwd(),
  './node_modules/wechaty-puppet-wechat4u/dist/esm/src',
);

fs.readdir(srcDir, (err, files) => {
  if (err) {
    return console.error('Could not list the directory.', err);
  }

  files.forEach((file) => {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);

    if (fs.statSync(srcFile).isFile()) {
      console.log(`copy from ${srcFile} to ${destFile}`);
      fs.copyFileSync(srcFile, destFile);
    }
  });
});