// @ts-nocheck
/** Browser stand-in for `fs` so teleproto/graceful-fs can load. Path I/O is unused. */

function unavailable(name) {
  return function notAvailable() {
    throw new Error(`fs.${name} is not available in the browser`);
  };
}

function existsSync() {
  return false;
}

function close(_fd, cb) {
  if (typeof cb === "function") cb(null);
}

function closeSync() {}

function mkdirSync() {}

function WriteStream() {}
function ReadStream() {}

module.exports = {
  existsSync,
  close,
  closeSync,
  mkdirSync,
  readFileSync: unavailable("readFileSync"),
  writeFileSync: unavailable("writeFileSync"),
  lstatSync: unavailable("lstatSync"),
  statSync: unavailable("statSync"),
  openSync: unavailable("openSync"),
  writeSync: unavailable("writeSync"),
  createReadStream: unavailable("createReadStream"),
  createWriteStream: unavailable("createWriteStream"),
  WriteStream,
  ReadStream,
  promises: {
    readFile: unavailable("promises.readFile"),
    writeFile: unavailable("promises.writeFile"),
  },
  constants: {},
};
