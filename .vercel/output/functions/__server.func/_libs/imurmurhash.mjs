import { t as __commonJSMin } from "../_runtime.mjs";
//#region node_modules/imurmurhash/imurmurhash.js
var require_imurmurhash = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* @preserve
	* JS Implementation of incremental MurmurHash3 (r150) (as of May 10, 2013)
	*
	* @author <a href="mailto:jensyt@gmail.com">Jens Taylor</a>
	* @see http://github.com/homebrewing/brauhaus-diff
	* @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
	* @see http://github.com/garycourt/murmurhash-js
	* @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
	* @see http://sites.google.com/site/murmurhash/
	*/
	(function() {
		var cache;
		function MurmurHash3(key, seed) {
			var m = this instanceof MurmurHash3 ? this : cache;
			m.reset(seed);
			if (typeof key === "string" && key.length > 0) m.hash(key);
			if (m !== this) return m;
		}
		MurmurHash3.prototype.hash = function(key) {
			var h1, k1, i, top, len = key.length;
			this.len += len;
			k1 = this.k1;
			i = 0;
			switch (this.rem) {
				case 0: k1 ^= len > i ? key.charCodeAt(i++) & 65535 : 0;
				case 1: k1 ^= len > i ? (key.charCodeAt(i++) & 65535) << 8 : 0;
				case 2: k1 ^= len > i ? (key.charCodeAt(i++) & 65535) << 16 : 0;
				case 3:
					k1 ^= len > i ? (key.charCodeAt(i) & 255) << 24 : 0;
					k1 ^= len > i ? (key.charCodeAt(i++) & 65280) >> 8 : 0;
			}
			this.rem = len + this.rem & 3;
			len -= this.rem;
			if (len > 0) {
				h1 = this.h1;
				while (1) {
					k1 = k1 * 11601 + (k1 & 65535) * 3432906752 & 4294967295;
					k1 = k1 << 15 | k1 >>> 17;
					k1 = k1 * 13715 + (k1 & 65535) * 461832192 & 4294967295;
					h1 ^= k1;
					h1 = h1 << 13 | h1 >>> 19;
					h1 = h1 * 5 + 3864292196 & 4294967295;
					if (i >= len) break;
					k1 = key.charCodeAt(i++) & 65535 ^ (key.charCodeAt(i++) & 65535) << 8 ^ (key.charCodeAt(i++) & 65535) << 16;
					top = key.charCodeAt(i++);
					k1 ^= (top & 255) << 24 ^ (top & 65280) >> 8;
				}
				k1 = 0;
				switch (this.rem) {
					case 3: k1 ^= (key.charCodeAt(i + 2) & 65535) << 16;
					case 2: k1 ^= (key.charCodeAt(i + 1) & 65535) << 8;
					case 1: k1 ^= key.charCodeAt(i) & 65535;
				}
				this.h1 = h1;
			}
			this.k1 = k1;
			return this;
		};
		MurmurHash3.prototype.result = function() {
			var k1 = this.k1, h1 = this.h1;
			if (k1 > 0) {
				k1 = k1 * 11601 + (k1 & 65535) * 3432906752 & 4294967295;
				k1 = k1 << 15 | k1 >>> 17;
				k1 = k1 * 13715 + (k1 & 65535) * 461832192 & 4294967295;
				h1 ^= k1;
			}
			h1 ^= this.len;
			h1 ^= h1 >>> 16;
			h1 = h1 * 51819 + (h1 & 65535) * 2246770688 & 4294967295;
			h1 ^= h1 >>> 13;
			h1 = h1 * 44597 + (h1 & 65535) * 3266445312 & 4294967295;
			h1 ^= h1 >>> 16;
			return h1 >>> 0;
		};
		MurmurHash3.prototype.reset = function(seed) {
			this.h1 = typeof seed === "number" ? seed : 0;
			this.rem = this.k1 = this.len = 0;
			return this;
		};
		cache = new MurmurHash3();
		if (typeof module != "undefined") module.exports = MurmurHash3;
		else this.MurmurHash3 = MurmurHash3;
	})();
}));
//#endregion
export { require_imurmurhash as t };
