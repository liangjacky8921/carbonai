const fs = require('node:fs');
const path = require('node:path');
const original = fs.writeFile;
// esbuild already supports stdin when its optional large-input tempfile write fails.
// On this Windows host, cross-process tempfile deletion is denied. Force only that
// optional IPC optimization to use esbuild's built-in stdin path; keep normal I/O.
fs.writeFile = function (name, data, ...rest) {
  if (typeof name === 'string' && /^esbuild-[a-f0-9]{64}$/.test(path.basename(name)) && data?.length > 1024 * 1024) {
    const callback = rest.at(-1);
    if (typeof callback === 'function') {
      process.stderr.write('[local build] esbuild large input sent through stdin instead of Windows tempfile\n');
      return process.nextTick(callback, Object.assign(new Error('Use built-in stdin IPC'), { code: 'EACCES' }));
    }
  }
  return original.call(this, name, data, ...rest);
};
