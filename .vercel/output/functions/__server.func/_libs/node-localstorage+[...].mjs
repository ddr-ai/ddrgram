import { i as __require, t as __commonJSMin } from "../_runtime.mjs";
import { nt as init_dist, tt as Buffer } from "./@tanstack/react-router+[...].mjs";
import { d as init_dist$1, f as process$1 } from "./@floating-ui/react-dom+[...].mjs";
import { i as require_events } from "./builtin-status-codes+[...].mjs";
import { t as require_graceful_fs } from "./graceful-fs.mjs";
import { t as require_imurmurhash } from "./imurmurhash.mjs";
//#region node_modules/path-browserify/index.js
var require_path_browserify = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	init_dist$1();
	function assertPath(path) {
		if (typeof path !== "string") throw new TypeError("Path must be a string. Received " + JSON.stringify(path));
	}
	function normalizeStringPosix(path, allowAboveRoot) {
		var res = "";
		var lastSegmentLength = 0;
		var lastSlash = -1;
		var dots = 0;
		var code;
		for (var i = 0; i <= path.length; ++i) {
			if (i < path.length) code = path.charCodeAt(i);
			else if (code === 47) break;
			else code = 47;
			if (code === 47) {
				if (lastSlash === i - 1 || dots === 1) {} else if (lastSlash !== i - 1 && dots === 2) {
					if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
						if (res.length > 2) {
							var lastSlashIndex = res.lastIndexOf("/");
							if (lastSlashIndex !== res.length - 1) {
								if (lastSlashIndex === -1) {
									res = "";
									lastSegmentLength = 0;
								} else {
									res = res.slice(0, lastSlashIndex);
									lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
								}
								lastSlash = i;
								dots = 0;
								continue;
							}
						} else if (res.length === 2 || res.length === 1) {
							res = "";
							lastSegmentLength = 0;
							lastSlash = i;
							dots = 0;
							continue;
						}
					}
					if (allowAboveRoot) {
						if (res.length > 0) res += "/..";
						else res = "..";
						lastSegmentLength = 2;
					}
				} else {
					if (res.length > 0) res += "/" + path.slice(lastSlash + 1, i);
					else res = path.slice(lastSlash + 1, i);
					lastSegmentLength = i - lastSlash - 1;
				}
				lastSlash = i;
				dots = 0;
			} else if (code === 46 && dots !== -1) ++dots;
			else dots = -1;
		}
		return res;
	}
	function _format(sep, pathObject) {
		var dir = pathObject.dir || pathObject.root;
		var base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
		if (!dir) return base;
		if (dir === pathObject.root) return dir + base;
		return dir + sep + base;
	}
	var posix = {
		resolve: function resolve() {
			var resolvedPath = "";
			var resolvedAbsolute = false;
			var cwd;
			for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
				var path;
				if (i >= 0) path = arguments[i];
				else {
					if (cwd === void 0) cwd = process$1.cwd();
					path = cwd;
				}
				assertPath(path);
				if (path.length === 0) continue;
				resolvedPath = path + "/" + resolvedPath;
				resolvedAbsolute = path.charCodeAt(0) === 47;
			}
			resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);
			if (resolvedAbsolute) {
				if (resolvedPath.length > 0) return "/" + resolvedPath;
				else return "/";
			} else if (resolvedPath.length > 0) return resolvedPath;
			else return ".";
		},
		normalize: function normalize(path) {
			assertPath(path);
			if (path.length === 0) return ".";
			var isAbsolute = path.charCodeAt(0) === 47;
			var trailingSeparator = path.charCodeAt(path.length - 1) === 47;
			path = normalizeStringPosix(path, !isAbsolute);
			if (path.length === 0 && !isAbsolute) path = ".";
			if (path.length > 0 && trailingSeparator) path += "/";
			if (isAbsolute) return "/" + path;
			return path;
		},
		isAbsolute: function isAbsolute(path) {
			assertPath(path);
			return path.length > 0 && path.charCodeAt(0) === 47;
		},
		join: function join() {
			if (arguments.length === 0) return ".";
			var joined;
			for (var i = 0; i < arguments.length; ++i) {
				var arg = arguments[i];
				assertPath(arg);
				if (arg.length > 0) {
					if (joined === void 0) joined = arg;
					else joined += "/" + arg;
				}
			}
			if (joined === void 0) return ".";
			return posix.normalize(joined);
		},
		relative: function relative(from, to) {
			assertPath(from);
			assertPath(to);
			if (from === to) return "";
			from = posix.resolve(from);
			to = posix.resolve(to);
			if (from === to) return "";
			var fromStart = 1;
			for (; fromStart < from.length; ++fromStart) if (from.charCodeAt(fromStart) !== 47) break;
			var fromEnd = from.length;
			var fromLen = fromEnd - fromStart;
			var toStart = 1;
			for (; toStart < to.length; ++toStart) if (to.charCodeAt(toStart) !== 47) break;
			var toLen = to.length - toStart;
			var length = fromLen < toLen ? fromLen : toLen;
			var lastCommonSep = -1;
			var i = 0;
			for (; i <= length; ++i) {
				if (i === length) {
					if (toLen > length) {
						if (to.charCodeAt(toStart + i) === 47) return to.slice(toStart + i + 1);
						else if (i === 0) return to.slice(toStart + i);
					} else if (fromLen > length) {
						if (from.charCodeAt(fromStart + i) === 47) lastCommonSep = i;
						else if (i === 0) lastCommonSep = 0;
					}
					break;
				}
				var fromCode = from.charCodeAt(fromStart + i);
				if (fromCode !== to.charCodeAt(toStart + i)) break;
				else if (fromCode === 47) lastCommonSep = i;
			}
			var out = "";
			for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) if (i === fromEnd || from.charCodeAt(i) === 47) {
				if (out.length === 0) out += "..";
				else out += "/..";
			}
			if (out.length > 0) return out + to.slice(toStart + lastCommonSep);
			else {
				toStart += lastCommonSep;
				if (to.charCodeAt(toStart) === 47) ++toStart;
				return to.slice(toStart);
			}
		},
		_makeLong: function _makeLong(path) {
			return path;
		},
		dirname: function dirname(path) {
			assertPath(path);
			if (path.length === 0) return ".";
			var code = path.charCodeAt(0);
			var hasRoot = code === 47;
			var end = -1;
			var matchedSlash = true;
			for (var i = path.length - 1; i >= 1; --i) {
				code = path.charCodeAt(i);
				if (code === 47) {
					if (!matchedSlash) {
						end = i;
						break;
					}
				} else matchedSlash = false;
			}
			if (end === -1) return hasRoot ? "/" : ".";
			if (hasRoot && end === 1) return "//";
			return path.slice(0, end);
		},
		basename: function basename(path, ext) {
			if (ext !== void 0 && typeof ext !== "string") throw new TypeError("\"ext\" argument must be a string");
			assertPath(path);
			var start = 0;
			var end = -1;
			var matchedSlash = true;
			var i;
			if (ext !== void 0 && ext.length > 0 && ext.length <= path.length) {
				if (ext.length === path.length && ext === path) return "";
				var extIdx = ext.length - 1;
				var firstNonSlashEnd = -1;
				for (i = path.length - 1; i >= 0; --i) {
					var code = path.charCodeAt(i);
					if (code === 47) {
						if (!matchedSlash) {
							start = i + 1;
							break;
						}
					} else {
						if (firstNonSlashEnd === -1) {
							matchedSlash = false;
							firstNonSlashEnd = i + 1;
						}
						if (extIdx >= 0) {
							if (code === ext.charCodeAt(extIdx)) {
								if (--extIdx === -1) end = i;
							} else {
								extIdx = -1;
								end = firstNonSlashEnd;
							}
						}
					}
				}
				if (start === end) end = firstNonSlashEnd;
				else if (end === -1) end = path.length;
				return path.slice(start, end);
			} else {
				for (i = path.length - 1; i >= 0; --i) if (path.charCodeAt(i) === 47) {
					if (!matchedSlash) {
						start = i + 1;
						break;
					}
				} else if (end === -1) {
					matchedSlash = false;
					end = i + 1;
				}
				if (end === -1) return "";
				return path.slice(start, end);
			}
		},
		extname: function extname(path) {
			assertPath(path);
			var startDot = -1;
			var startPart = 0;
			var end = -1;
			var matchedSlash = true;
			var preDotState = 0;
			for (var i = path.length - 1; i >= 0; --i) {
				var code = path.charCodeAt(i);
				if (code === 47) {
					if (!matchedSlash) {
						startPart = i + 1;
						break;
					}
					continue;
				}
				if (end === -1) {
					matchedSlash = false;
					end = i + 1;
				}
				if (code === 46) {
					if (startDot === -1) startDot = i;
					else if (preDotState !== 1) preDotState = 1;
				} else if (startDot !== -1) preDotState = -1;
			}
			if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) return "";
			return path.slice(startDot, end);
		},
		format: function format(pathObject) {
			if (pathObject === null || typeof pathObject !== "object") throw new TypeError("The \"pathObject\" argument must be of type Object. Received type " + typeof pathObject);
			return _format("/", pathObject);
		},
		parse: function parse(path) {
			assertPath(path);
			var ret = {
				root: "",
				dir: "",
				base: "",
				ext: "",
				name: ""
			};
			if (path.length === 0) return ret;
			var code = path.charCodeAt(0);
			var isAbsolute = code === 47;
			var start;
			if (isAbsolute) {
				ret.root = "/";
				start = 1;
			} else start = 0;
			var startDot = -1;
			var startPart = 0;
			var end = -1;
			var matchedSlash = true;
			var i = path.length - 1;
			var preDotState = 0;
			for (; i >= start; --i) {
				code = path.charCodeAt(i);
				if (code === 47) {
					if (!matchedSlash) {
						startPart = i + 1;
						break;
					}
					continue;
				}
				if (end === -1) {
					matchedSlash = false;
					end = i + 1;
				}
				if (code === 46) {
					if (startDot === -1) startDot = i;
					else if (preDotState !== 1) preDotState = 1;
				} else if (startDot !== -1) preDotState = -1;
			}
			if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
				if (end !== -1) {
					if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);
					else ret.base = ret.name = path.slice(startPart, end);
				}
			} else {
				if (startPart === 0 && isAbsolute) {
					ret.name = path.slice(1, startDot);
					ret.base = path.slice(1, end);
				} else {
					ret.name = path.slice(startPart, startDot);
					ret.base = path.slice(startPart, end);
				}
				ret.ext = path.slice(startDot, end);
			}
			if (startPart > 0) ret.dir = path.slice(0, startPart - 1);
			else if (isAbsolute) ret.dir = "/";
			return ret;
		},
		sep: "/",
		delimiter: ":",
		win32: null,
		posix: null
	};
	posix.posix = posix;
	module.exports = posix;
}));
//#endregion
//#region node_modules/slide/lib/async-map.js
var require_async_map = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	init_dist$1();
	module.exports = asyncMap;
	function asyncMap() {
		var steps = Array.prototype.slice.call(arguments), list = steps.shift() || [], cb_ = steps.pop();
		if (typeof cb_ !== "function") throw new Error("No callback provided to asyncMap");
		if (!list) return cb_(null, []);
		if (!Array.isArray(list)) list = [list];
		var n = steps.length, data = [], errState = null, l = list.length, a = l * n;
		if (!a) return cb_(null, []);
		function cb(er) {
			if (er && !errState) errState = er;
			var argLen = arguments.length;
			for (var i = 1; i < argLen; i++) if (arguments[i] !== void 0) data[i - 1] = (data[i - 1] || []).concat(arguments[i]);
			if (list.length > l) {
				var newList = list.slice(l);
				a += (list.length - l) * n;
				l = list.length;
				process$1.nextTick(function() {
					newList.forEach(function(ar) {
						steps.forEach(function(fn) {
							fn(ar, cb);
						});
					});
				});
			}
			if (--a === 0) cb_.apply(null, [errState].concat(data));
		}
		list.forEach(function(ar) {
			steps.forEach(function(fn) {
				fn(ar, cb);
			});
		});
	}
}));
//#endregion
//#region node_modules/slide/lib/bind-actor.js
var require_bind_actor = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = bindActor;
	function bindActor() {
		var args = Array.prototype.slice.call(arguments), obj = null, fn;
		if (typeof args[0] === "object") {
			obj = args.shift();
			fn = args.shift();
			if (typeof fn === "string") fn = obj[fn];
		} else fn = args.shift();
		return function(cb) {
			fn.apply(obj, args.concat(cb));
		};
	}
}));
//#endregion
//#region node_modules/slide/lib/chain.js
var require_chain = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = chain;
	var bindActor = require_bind_actor();
	chain.first = {};
	chain.last = {};
	function chain(things, cb) {
		var res = [];
		(function LOOP(i, len) {
			if (i >= len) return cb(null, res);
			if (Array.isArray(things[i])) things[i] = bindActor.apply(null, things[i].map(function(i) {
				return i === chain.first ? res[0] : i === chain.last ? res[res.length - 1] : i;
			}));
			if (!things[i]) return LOOP(i + 1, len);
			things[i](function(er, data) {
				if (er) return cb(er, res);
				if (data !== void 0) res = res.concat(data);
				LOOP(i + 1, len);
			});
		})(0, things.length);
	}
}));
//#endregion
//#region node_modules/slide/lib/slide.js
var require_slide = /* @__PURE__ */ __commonJSMin(((exports) => {
	exports.asyncMap = require_async_map();
	exports.bindActor = require_bind_actor();
	exports.chain = require_chain();
}));
//#endregion
//#region node_modules/write-file-atomic/index.js
var require_write_file_atomic = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	init_dist();
	init_dist$1();
	module.exports = writeFile;
	module.exports.sync = writeFileSync;
	module.exports._getTmpname = getTmpname;
	var fs = require_graceful_fs();
	var chain = require_slide().chain;
	var MurmurHash3 = require_imurmurhash();
	var extend = Object.assign || __require("node:util")._extend;
	var invocations = 0;
	function getTmpname(filename) {
		return filename + "." + MurmurHash3(__filename).hash(String(process$1.pid)).hash(String(++invocations)).result();
	}
	function writeFile(filename, data, options, callback) {
		if (options instanceof Function) {
			callback = options;
			options = null;
		}
		if (!options) options = {};
		fs.realpath(filename, function(_, realname) {
			_writeFile(realname || filename, data, options, callback);
		});
	}
	function _writeFile(filename, data, options, callback) {
		var tmpfile = getTmpname(filename);
		if (options.mode && options.chown) return thenWriteFile();
		else return fs.stat(filename, function(err, stats) {
			if (err || !stats) return thenWriteFile();
			options = extend({}, options);
			if (!options.mode) options.mode = stats.mode;
			if (!options.chown && process$1.getuid) options.chown = {
				uid: stats.uid,
				gid: stats.gid
			};
			return thenWriteFile();
		});
		function thenWriteFile() {
			chain([
				[
					writeFileAsync,
					tmpfile,
					data,
					options.mode,
					options.encoding || "utf8"
				],
				options.chown && [
					fs,
					fs.chown,
					tmpfile,
					options.chown.uid,
					options.chown.gid
				],
				options.mode && [
					fs,
					fs.chmod,
					tmpfile,
					options.mode
				],
				[
					fs,
					fs.rename,
					tmpfile,
					filename
				]
			], function(err) {
				err ? fs.unlink(tmpfile, function() {
					callback(err);
				}) : callback();
			});
		}
		function writeFileAsync(file, data, mode, encoding, cb) {
			fs.open(file, "w", options.mode, function(err, fd) {
				if (err) return cb(err);
				if (Buffer.isBuffer(data)) return fs.write(fd, data, 0, data.length, 0, syncAndClose);
				else if (data != null) return fs.write(fd, String(data), 0, String(encoding), syncAndClose);
				else return syncAndClose();
				function syncAndClose(err) {
					if (err) return cb(err);
					fs.fsync(fd, function(err) {
						if (err) return cb(err);
						fs.close(fd, cb);
					});
				}
			});
		}
	}
	function writeFileSync(filename, data, options) {
		if (!options) options = {};
		try {
			filename = fs.realpathSync(filename);
		} catch (ex) {}
		var tmpfile = getTmpname(filename);
		try {
			if (!options.mode || !options.chown) try {
				var stats = fs.statSync(filename);
				options = extend({}, options);
				if (!options.mode) options.mode = stats.mode;
				if (!options.chown && process$1.getuid) options.chown = {
					uid: stats.uid,
					gid: stats.gid
				};
			} catch (ex) {}
			var fd = fs.openSync(tmpfile, "w", options.mode);
			if (Buffer.isBuffer(data)) fs.writeSync(fd, data, 0, data.length, 0);
			else if (data != null) fs.writeSync(fd, String(data), 0, String(options.encoding || "utf8"));
			fs.fsyncSync(fd);
			fs.closeSync(fd);
			if (options.chown) fs.chownSync(tmpfile, options.chown.uid, options.chown.gid);
			if (options.mode) fs.chmodSync(tmpfile, options.mode);
			fs.renameSync(tmpfile, filename);
		} catch (err) {
			try {
				fs.unlinkSync(tmpfile);
			} catch (e) {}
			throw err;
		}
	}
}));
//#endregion
//#region node_modules/node-localstorage/LocalStorage.js
var require_LocalStorage = /* @__PURE__ */ __commonJSMin(((exports) => {
	init_dist$1();
	(function() {
		var JSONStorage, KEY_FOR_EMPTY_STRING, LocalStorage, MetaKey, QUOTA_EXCEEDED_ERR, StorageEvent, _emptyDirectory, _escapeKey, _rm, createMap, events, fs, path, writeSync, extend = function(child, parent) {
			for (var key in parent) if (hasProp.call(parent, key)) child[key] = parent[key];
			function ctor() {
				this.constructor = child;
			}
			ctor.prototype = parent.prototype;
			child.prototype = new ctor();
			child.__super__ = parent.prototype;
			return child;
		}, hasProp = {}.hasOwnProperty;
		path = require_path_browserify();
		fs = __require("node:fs");
		events = require_events();
		writeSync = require_write_file_atomic().sync;
		KEY_FOR_EMPTY_STRING = "---.EMPTY_STRING.---";
		_emptyDirectory = function(target) {
			var i, len, p, ref = fs.readdirSync(target), results = [];
			for (i = 0, len = ref.length; i < len; i++) {
				p = ref[i];
				results.push(_rm(path.join(target, p)));
			}
			return results;
		};
		_rm = function(target) {
			if (fs.statSync(target).isDirectory()) {
				_emptyDirectory(target);
				return fs.rmdirSync(target);
			} else return fs.unlinkSync(target);
		};
		_escapeKey = function(key) {
			var newKey;
			if (key === "") newKey = KEY_FOR_EMPTY_STRING;
			else newKey = "" + key;
			return newKey;
		};
		QUOTA_EXCEEDED_ERR = (function(superClass) {
			extend(QUOTA_EXCEEDED_ERR, superClass);
			function QUOTA_EXCEEDED_ERR(message) {
				this.message = message != null ? message : "Unknown error.";
				QUOTA_EXCEEDED_ERR.__super__.constructor.call(this);
				if (Error.captureStackTrace != null) Error.captureStackTrace(this, this.constructor);
				this.name = this.constructor.name;
			}
			QUOTA_EXCEEDED_ERR.prototype.toString = function() {
				return this.name + ": " + this.message;
			};
			return QUOTA_EXCEEDED_ERR;
		})(Error);
		StorageEvent = (function() {
			function StorageEvent(key1, oldValue1, newValue1, url, storageArea) {
				this.key = key1;
				this.oldValue = oldValue1;
				this.newValue = newValue1;
				this.url = url;
				this.storageArea = storageArea != null ? storageArea : "localStorage";
			}
			return StorageEvent;
		})();
		MetaKey = (function() {
			function MetaKey(key1, index1) {
				this.key = key1;
				this.index = index1;
				if (!(this instanceof MetaKey)) return new MetaKey(this.key, this.index);
			}
			return MetaKey;
		})();
		createMap = function() {
			var Map = function() {};
			Map.prototype = Object.create(null);
			return new Map();
		};
		LocalStorage = (function(superClass) {
			var instanceMap;
			extend(LocalStorage, superClass);
			instanceMap = {};
			function LocalStorage(_location, quota) {
				var handler;
				this._location = _location;
				this.quota = quota != null ? quota : 5242880;
				LocalStorage.__super__.constructor.call(this);
				if (!(this instanceof LocalStorage)) return new LocalStorage(this._location, this.quota);
				this._location = path.resolve(this._location);
				if (instanceMap[this._location] != null) return instanceMap[this._location];
				this.length = 0;
				this._bytesInUse = 0;
				this._keys = [];
				this._metaKeyMap = createMap();
				this._eventUrl = "pid:" + process$1.pid;
				this._init();
				this._QUOTA_EXCEEDED_ERR = QUOTA_EXCEEDED_ERR;
				if (typeof Proxy !== "undefined" && Proxy !== null) {
					handler = {
						set: (function(_this) {
							return function(receiver, key, value) {
								if (_this[key] != null) return _this[key] = value;
								else return _this.setItem(key, value);
							};
						})(this),
						get: (function(_this) {
							return function(receiver, key) {
								if (_this[key] != null) return _this[key];
								else return _this.getItem(key);
							};
						})(this)
					};
					instanceMap[this._location] = new Proxy(this, handler);
					return instanceMap[this._location];
				}
				instanceMap[this._location] = this;
				return instanceMap[this._location];
			}
			LocalStorage.prototype._init = function() {
				var _MetaKey, _decodedKey, _keys, e, i, index, k, len, stat;
				try {
					stat = fs.statSync(this._location);
					if (stat != null && !stat.isDirectory()) throw new Error("A file exists at the location '" + this._location + "' when trying to create/open localStorage");
					this._bytesInUse = 0;
					this.length = 0;
					_keys = fs.readdirSync(this._location);
					for (index = i = 0, len = _keys.length; i < len; index = ++i) {
						k = _keys[index];
						_decodedKey = decodeURIComponent(k);
						this._keys.push(_decodedKey);
						_MetaKey = new MetaKey(k, index);
						this._metaKeyMap[_decodedKey] = _MetaKey;
						stat = this._getStat(k);
						if ((stat != null ? stat.size : void 0) != null) {
							_MetaKey.size = stat.size;
							this._bytesInUse += stat.size;
						}
					}
					this.length = _keys.length;
				} catch (error) {
					e = error;
					if (e.code !== "ENOENT") throw e;
					try {
						fs.mkdirSync(this._location, { recursive: true });
					} catch (error) {
						e = error;
						if (e.code !== "EEXIST") throw e;
					}
				}
			};
			LocalStorage.prototype.setItem = function(key, value) {
				var encodedKey, evnt, existsBeforeSet, filename, hasListeners = this.listenerCount("storage"), metaKey, oldLength, oldValue = null, valueString, valueStringLength;
				if (hasListeners) oldValue = this.getItem(key);
				key = _escapeKey(key);
				encodedKey = encodeURIComponent(key).replace(/[!'()]/g, escape).replace(/\*/g, "%2A");
				filename = path.join(this._location, encodedKey);
				valueString = "" + value;
				valueStringLength = valueString.length;
				metaKey = this._metaKeyMap[key];
				existsBeforeSet = !!metaKey;
				if (existsBeforeSet) oldLength = metaKey.size;
				else oldLength = 0;
				if (this._bytesInUse - oldLength + valueStringLength > this.quota) throw new QUOTA_EXCEEDED_ERR();
				writeSync(filename, valueString, { encoding: "utf8" });
				if (!existsBeforeSet) {
					metaKey = new MetaKey(encodedKey, this._keys.push(key) - 1);
					metaKey.size = valueStringLength;
					this._metaKeyMap[key] = metaKey;
					this.length += 1;
					this._bytesInUse += valueStringLength;
				}
				if (hasListeners) {
					evnt = new StorageEvent(key, oldValue, value, this._eventUrl);
					return this.emit("storage", evnt);
				}
			};
			LocalStorage.prototype.getItem = function(key) {
				var filename, metaKey;
				key = _escapeKey(key);
				metaKey = this._metaKeyMap[key];
				if (!!metaKey) {
					filename = path.join(this._location, metaKey.key);
					return fs.readFileSync(filename, "utf8");
				} else return null;
			};
			LocalStorage.prototype._getStat = function(key) {
				var filename;
				key = _escapeKey(key);
				filename = path.join(this._location, encodeURIComponent(key));
				try {
					return fs.statSync(filename);
				} catch (error) {
					return null;
				}
			};
			LocalStorage.prototype.removeItem = function(key) {
				var evnt, filename, hasListeners, k, meta, metaKey, oldValue, ref;
				key = _escapeKey(key);
				metaKey = this._metaKeyMap[key];
				if (!!metaKey) {
					hasListeners = this.listenerCount("storage");
					oldValue = null;
					if (hasListeners) oldValue = this.getItem(key);
					delete this._metaKeyMap[key];
					this.length -= 1;
					this._bytesInUse -= metaKey.size;
					filename = path.join(this._location, metaKey.key);
					this._keys.splice(metaKey.index, 1);
					ref = this._metaKeyMap;
					for (k in ref) {
						ref[k];
						meta = this._metaKeyMap[k];
						if (meta.index > metaKey.index) meta.index -= 1;
					}
					_rm(filename);
					if (hasListeners) {
						evnt = new StorageEvent(key, oldValue, null, this._eventUrl);
						return this.emit("storage", evnt);
					}
				}
			};
			LocalStorage.prototype.key = function(n) {
				var rawKey = this._keys[n];
				if (rawKey === KEY_FOR_EMPTY_STRING) return "";
				else return rawKey;
			};
			LocalStorage.prototype.clear = function() {
				var evnt;
				_emptyDirectory(this._location);
				this._metaKeyMap = createMap();
				this._keys = [];
				this.length = 0;
				this._bytesInUse = 0;
				if (this.listenerCount("storage")) {
					evnt = new StorageEvent(null, null, null, this._eventUrl);
					return this.emit("storage", evnt);
				}
			};
			LocalStorage.prototype._getBytesInUse = function() {
				return this._bytesInUse;
			};
			LocalStorage.prototype._deleteLocation = function() {
				delete instanceMap[this._location];
				_rm(this._location);
				this._metaKeyMap = {};
				this._keys = [];
				this.length = 0;
				return this._bytesInUse = 0;
			};
			return LocalStorage;
		})(events.EventEmitter);
		JSONStorage = (function(superClass) {
			extend(JSONStorage, superClass);
			function JSONStorage() {
				return JSONStorage.__super__.constructor.apply(this, arguments);
			}
			JSONStorage.prototype.setItem = function(key, value) {
				var newValue = JSON.stringify(value);
				return JSONStorage.__super__.setItem.call(this, key, newValue);
			};
			JSONStorage.prototype.getItem = function(key) {
				return JSON.parse(JSONStorage.__super__.getItem.call(this, key));
			};
			return JSONStorage;
		})(LocalStorage);
		exports.LocalStorage = LocalStorage;
		exports.JSONStorage = JSONStorage;
		exports.QUOTA_EXCEEDED_ERR = QUOTA_EXCEEDED_ERR;
	}).call(exports);
}));
//#endregion
export { require_path_browserify as n, require_LocalStorage as t };
