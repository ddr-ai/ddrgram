import { a as __toCommonJS, i as __require, t as __commonJSMin } from "../_runtime.mjs";
import { nt as init_dist, tt as Buffer } from "./@tanstack/react-router+[...].mjs";
import { c as init_empty, s as empty_exports } from "./h3+[...].mjs";
import { i as require_events } from "./builtin-status-codes+[...].mjs";
import { t as require_smartbuffer } from "./smart-buffer.mjs";
import { t as require_ip_address } from "./ip-address.mjs";
//#region node_modules/socks/build/common/constants.js
var require_constants = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.SOCKS5_NO_ACCEPTABLE_AUTH = exports.SOCKS5_CUSTOM_AUTH_END = exports.SOCKS5_CUSTOM_AUTH_START = exports.SOCKS_INCOMING_PACKET_SIZES = exports.SocksClientState = exports.Socks5Response = exports.Socks5HostType = exports.Socks5Auth = exports.Socks4Response = exports.SocksCommand = exports.ERRORS = exports.DEFAULT_TIMEOUT = void 0;
	exports.DEFAULT_TIMEOUT = 3e4;
	exports.ERRORS = {
		InvalidSocksCommand: "An invalid SOCKS command was provided. Valid options are connect, bind, and associate.",
		InvalidSocksCommandForOperation: "An invalid SOCKS command was provided. Only a subset of commands are supported for this operation.",
		InvalidSocksCommandChain: "An invalid SOCKS command was provided. Chaining currently only supports the connect command.",
		InvalidSocksClientOptionsDestination: "An invalid destination host was provided.",
		InvalidSocksClientOptionsExistingSocket: "An invalid existing socket was provided. This should be an instance of stream.Duplex.",
		InvalidSocksClientOptionsProxy: "Invalid SOCKS proxy details were provided.",
		InvalidSocksClientOptionsTimeout: "An invalid timeout value was provided. Please enter a value above 0 (in ms).",
		InvalidSocksClientOptionsProxiesLength: "At least two socks proxies must be provided for chaining.",
		InvalidSocksClientOptionsCustomAuthRange: "Custom auth must be a value between 0x80 and 0xFE.",
		InvalidSocksClientOptionsCustomAuthOptions: "When a custom_auth_method is provided, custom_auth_request_handler, custom_auth_response_size, and custom_auth_response_handler must also be provided and valid.",
		NegotiationError: "Negotiation error",
		SocketClosed: "Socket closed",
		ProxyConnectionTimedOut: "Proxy connection timed out",
		InternalError: "SocksClient internal error (this should not happen)",
		InvalidSocks4HandshakeResponse: "Received invalid Socks4 handshake response",
		Socks4ProxyRejectedConnection: "Socks4 Proxy rejected connection",
		InvalidSocks4IncomingConnectionResponse: "Socks4 invalid incoming connection response",
		Socks4ProxyRejectedIncomingBoundConnection: "Socks4 Proxy rejected incoming bound connection",
		InvalidSocks5InitialHandshakeResponse: "Received invalid Socks5 initial handshake response",
		InvalidSocks5IntiailHandshakeSocksVersion: "Received invalid Socks5 initial handshake (invalid socks version)",
		InvalidSocks5InitialHandshakeNoAcceptedAuthType: "Received invalid Socks5 initial handshake (no accepted authentication type)",
		InvalidSocks5InitialHandshakeUnknownAuthType: "Received invalid Socks5 initial handshake (unknown authentication type)",
		Socks5AuthenticationFailed: "Socks5 Authentication failed",
		InvalidSocks5FinalHandshake: "Received invalid Socks5 final handshake response",
		InvalidSocks5FinalHandshakeRejected: "Socks5 proxy rejected connection",
		InvalidSocks5IncomingConnectionResponse: "Received invalid Socks5 incoming connection response",
		Socks5ProxyRejectedIncomingBoundConnection: "Socks5 Proxy rejected incoming bound connection"
	};
	exports.SOCKS_INCOMING_PACKET_SIZES = {
		Socks5InitialHandshakeResponse: 2,
		Socks5UserPassAuthenticationResponse: 2,
		Socks5ResponseHeader: 5,
		Socks5ResponseIPv4: 10,
		Socks5ResponseIPv6: 22,
		Socks5ResponseHostname: (hostNameLength) => hostNameLength + 7,
		Socks4Response: 8
	};
	var SocksCommand;
	(function(SocksCommand) {
		SocksCommand[SocksCommand["connect"] = 1] = "connect";
		SocksCommand[SocksCommand["bind"] = 2] = "bind";
		SocksCommand[SocksCommand["associate"] = 3] = "associate";
	})(SocksCommand || (exports.SocksCommand = SocksCommand = {}));
	var Socks4Response;
	(function(Socks4Response) {
		Socks4Response[Socks4Response["Granted"] = 90] = "Granted";
		Socks4Response[Socks4Response["Failed"] = 91] = "Failed";
		Socks4Response[Socks4Response["Rejected"] = 92] = "Rejected";
		Socks4Response[Socks4Response["RejectedIdent"] = 93] = "RejectedIdent";
	})(Socks4Response || (exports.Socks4Response = Socks4Response = {}));
	var Socks5Auth;
	(function(Socks5Auth) {
		Socks5Auth[Socks5Auth["NoAuth"] = 0] = "NoAuth";
		Socks5Auth[Socks5Auth["GSSApi"] = 1] = "GSSApi";
		Socks5Auth[Socks5Auth["UserPass"] = 2] = "UserPass";
	})(Socks5Auth || (exports.Socks5Auth = Socks5Auth = {}));
	exports.SOCKS5_CUSTOM_AUTH_START = 128;
	exports.SOCKS5_CUSTOM_AUTH_END = 254;
	exports.SOCKS5_NO_ACCEPTABLE_AUTH = 255;
	var Socks5Response;
	(function(Socks5Response) {
		Socks5Response[Socks5Response["Granted"] = 0] = "Granted";
		Socks5Response[Socks5Response["Failure"] = 1] = "Failure";
		Socks5Response[Socks5Response["NotAllowed"] = 2] = "NotAllowed";
		Socks5Response[Socks5Response["NetworkUnreachable"] = 3] = "NetworkUnreachable";
		Socks5Response[Socks5Response["HostUnreachable"] = 4] = "HostUnreachable";
		Socks5Response[Socks5Response["ConnectionRefused"] = 5] = "ConnectionRefused";
		Socks5Response[Socks5Response["TTLExpired"] = 6] = "TTLExpired";
		Socks5Response[Socks5Response["CommandNotSupported"] = 7] = "CommandNotSupported";
		Socks5Response[Socks5Response["AddressNotSupported"] = 8] = "AddressNotSupported";
	})(Socks5Response || (exports.Socks5Response = Socks5Response = {}));
	var Socks5HostType;
	(function(Socks5HostType) {
		Socks5HostType[Socks5HostType["IPv4"] = 1] = "IPv4";
		Socks5HostType[Socks5HostType["Hostname"] = 3] = "Hostname";
		Socks5HostType[Socks5HostType["IPv6"] = 4] = "IPv6";
	})(Socks5HostType || (exports.Socks5HostType = Socks5HostType = {}));
	var SocksClientState;
	(function(SocksClientState) {
		SocksClientState[SocksClientState["Created"] = 0] = "Created";
		SocksClientState[SocksClientState["Connecting"] = 1] = "Connecting";
		SocksClientState[SocksClientState["Connected"] = 2] = "Connected";
		SocksClientState[SocksClientState["SentInitialHandshake"] = 3] = "SentInitialHandshake";
		SocksClientState[SocksClientState["ReceivedInitialHandshakeResponse"] = 4] = "ReceivedInitialHandshakeResponse";
		SocksClientState[SocksClientState["SentAuthentication"] = 5] = "SentAuthentication";
		SocksClientState[SocksClientState["ReceivedAuthenticationResponse"] = 6] = "ReceivedAuthenticationResponse";
		SocksClientState[SocksClientState["SentFinalHandshake"] = 7] = "SentFinalHandshake";
		SocksClientState[SocksClientState["ReceivedFinalResponse"] = 8] = "ReceivedFinalResponse";
		SocksClientState[SocksClientState["BoundWaitingForConnection"] = 9] = "BoundWaitingForConnection";
		SocksClientState[SocksClientState["Established"] = 10] = "Established";
		SocksClientState[SocksClientState["Disconnected"] = 11] = "Disconnected";
		SocksClientState[SocksClientState["Error"] = 99] = "Error";
	})(SocksClientState || (exports.SocksClientState = SocksClientState = {}));
}));
//#endregion
//#region node_modules/socks/build/common/util.js
var require_util = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.shuffleArray = exports.SocksClientError = void 0;
	/**
	* Error wrapper for SocksClient
	*/
	var SocksClientError = class extends Error {
		constructor(message, options) {
			super(message);
			this.options = options;
		}
	};
	exports.SocksClientError = SocksClientError;
	/**
	* Shuffles a given array.
	* @param array The array to shuffle.
	*/
	function shuffleArray(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}
	exports.shuffleArray = shuffleArray;
}));
//#endregion
//#region node_modules/socks/build/common/helpers.js
var require_helpers = /* @__PURE__ */ __commonJSMin(((exports) => {
	init_dist();
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ipToBuffer = exports.int32ToIpv4 = exports.ipv4ToInt32 = exports.validateSocksClientChainOptions = exports.validateSocksClientOptions = void 0;
	var util_1 = require_util();
	var constants_1 = require_constants();
	var stream = __require("node:stream");
	var ip_address_1 = require_ip_address();
	var net = (init_empty(), __toCommonJS(empty_exports));
	/**
	* Validates the provided SocksClientOptions
	* @param options { SocksClientOptions }
	* @param acceptedCommands { string[] } A list of accepted SocksProxy commands.
	*/
	function validateSocksClientOptions(options, acceptedCommands = [
		"connect",
		"bind",
		"associate"
	]) {
		if (!constants_1.SocksCommand[options.command]) throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksCommand, options);
		if (acceptedCommands.indexOf(options.command) === -1) throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksCommandForOperation, options);
		if (!isValidSocksRemoteHost(options.destination)) throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksClientOptionsDestination, options);
		if (!isValidSocksProxy(options.proxy)) throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksClientOptionsProxy, options);
		validateCustomProxyAuth(options.proxy, options);
		if (options.timeout && !isValidTimeoutValue(options.timeout)) throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksClientOptionsTimeout, options);
		if (options.existing_socket && !(options.existing_socket instanceof stream.Duplex)) throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksClientOptionsExistingSocket, options);
	}
	exports.validateSocksClientOptions = validateSocksClientOptions;
	/**
	* Validates the SocksClientChainOptions
	* @param options { SocksClientChainOptions }
	*/
	function validateSocksClientChainOptions(options) {
		if (options.command !== "connect") throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksCommandChain, options);
		if (!isValidSocksRemoteHost(options.destination)) throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksClientOptionsDestination, options);
		if (!(options.proxies && Array.isArray(options.proxies) && options.proxies.length >= 2)) throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksClientOptionsProxiesLength, options);
		options.proxies.forEach((proxy) => {
			if (!isValidSocksProxy(proxy)) throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksClientOptionsProxy, options);
			validateCustomProxyAuth(proxy, options);
		});
		if (options.timeout && !isValidTimeoutValue(options.timeout)) throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksClientOptionsTimeout, options);
	}
	exports.validateSocksClientChainOptions = validateSocksClientChainOptions;
	function validateCustomProxyAuth(proxy, options) {
		if (proxy.custom_auth_method !== void 0) {
			if (proxy.custom_auth_method < constants_1.SOCKS5_CUSTOM_AUTH_START || proxy.custom_auth_method > constants_1.SOCKS5_CUSTOM_AUTH_END) throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksClientOptionsCustomAuthRange, options);
			if (proxy.custom_auth_request_handler === void 0 || typeof proxy.custom_auth_request_handler !== "function") throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksClientOptionsCustomAuthOptions, options);
			if (proxy.custom_auth_response_size === void 0) throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksClientOptionsCustomAuthOptions, options);
			if (proxy.custom_auth_response_handler === void 0 || typeof proxy.custom_auth_response_handler !== "function") throw new util_1.SocksClientError(constants_1.ERRORS.InvalidSocksClientOptionsCustomAuthOptions, options);
		}
	}
	/**
	* Validates a SocksRemoteHost
	* @param remoteHost { SocksRemoteHost }
	*/
	function isValidSocksRemoteHost(remoteHost) {
		return remoteHost && typeof remoteHost.host === "string" && Buffer.byteLength(remoteHost.host) < 256 && typeof remoteHost.port === "number" && remoteHost.port >= 0 && remoteHost.port <= 65535;
	}
	/**
	* Validates a SocksProxy
	* @param proxy { SocksProxy }
	*/
	function isValidSocksProxy(proxy) {
		return proxy && (typeof proxy.host === "string" || typeof proxy.ipaddress === "string") && typeof proxy.port === "number" && proxy.port >= 0 && proxy.port <= 65535 && (proxy.type === 4 || proxy.type === 5);
	}
	/**
	* Validates a timeout value.
	* @param value { Number }
	*/
	function isValidTimeoutValue(value) {
		return typeof value === "number" && value > 0;
	}
	function ipv4ToInt32(ip) {
		return new ip_address_1.Address4(ip).toArray().reduce((acc, part) => (acc << 8) + part, 0) >>> 0;
	}
	exports.ipv4ToInt32 = ipv4ToInt32;
	function int32ToIpv4(int32) {
		return [
			int32 >>> 24 & 255,
			int32 >>> 16 & 255,
			int32 >>> 8 & 255,
			int32 & 255
		].join(".");
	}
	exports.int32ToIpv4 = int32ToIpv4;
	function ipToBuffer(ip) {
		if (net.isIPv4(ip)) {
			const address = new ip_address_1.Address4(ip);
			return Buffer.from(address.toArray());
		} else if (net.isIPv6(ip)) {
			const address = new ip_address_1.Address6(ip);
			return Buffer.from(address.canonicalForm().split(":").map((segment) => segment.padStart(4, "0")).join(""), "hex");
		} else throw new Error("Invalid IP address format");
	}
	exports.ipToBuffer = ipToBuffer;
}));
//#endregion
//#region node_modules/socks/build/common/receivebuffer.js
var require_receivebuffer = /* @__PURE__ */ __commonJSMin(((exports) => {
	init_dist();
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ReceiveBuffer = void 0;
	var ReceiveBuffer = class {
		constructor(size = 4096) {
			this.buffer = Buffer.allocUnsafe(size);
			this.offset = 0;
			this.originalSize = size;
		}
		get length() {
			return this.offset;
		}
		append(data) {
			if (!Buffer.isBuffer(data)) throw new Error("Attempted to append a non-buffer instance to ReceiveBuffer.");
			if (this.offset + data.length >= this.buffer.length) {
				const tmp = this.buffer;
				this.buffer = Buffer.allocUnsafe(Math.max(this.buffer.length + this.originalSize, this.buffer.length + data.length));
				tmp.copy(this.buffer);
			}
			data.copy(this.buffer, this.offset);
			return this.offset += data.length;
		}
		peek(length) {
			if (length > this.offset) throw new Error("Attempted to read beyond the bounds of the managed internal data.");
			return this.buffer.slice(0, length);
		}
		get(length) {
			if (length > this.offset) throw new Error("Attempted to read beyond the bounds of the managed internal data.");
			const value = Buffer.allocUnsafe(length);
			this.buffer.slice(0, length).copy(value);
			this.buffer.copyWithin(0, length, length + this.offset - length);
			this.offset -= length;
			return value;
		}
	};
	exports.ReceiveBuffer = ReceiveBuffer;
}));
//#endregion
//#region node_modules/socks/build/client/socksclient.js
var require_socksclient = /* @__PURE__ */ __commonJSMin(((exports) => {
	init_dist();
	var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P ? value : new P(function(resolve) {
				resolve(value);
			});
		}
		return new (P || (P = Promise))(function(resolve, reject) {
			function fulfilled(value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected(value) {
				try {
					step(generator["throw"](value));
				} catch (e) {
					reject(e);
				}
			}
			function step(result) {
				result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.SocksClientError = exports.SocksClient = void 0;
	var events_1 = require_events();
	var net = (init_empty(), __toCommonJS(empty_exports));
	var smart_buffer_1 = require_smartbuffer();
	var constants_1 = require_constants();
	var helpers_1 = require_helpers();
	var receivebuffer_1 = require_receivebuffer();
	var util_1 = require_util();
	Object.defineProperty(exports, "SocksClientError", {
		enumerable: true,
		get: function() {
			return util_1.SocksClientError;
		}
	});
	var ip_address_1 = require_ip_address();
	exports.SocksClient = class SocksClient extends events_1.EventEmitter {
		constructor(options) {
			super();
			this.options = Object.assign({}, options);
			(0, helpers_1.validateSocksClientOptions)(options);
			this.setState(constants_1.SocksClientState.Created);
		}
		/**
		* Creates a new SOCKS connection.
		*
		* Note: Supports callbacks and promises. Only supports the connect command.
		* @param options { SocksClientOptions } Options.
		* @param callback { Function } An optional callback function.
		* @returns { Promise }
		*/
		static createConnection(options, callback) {
			return new Promise((resolve, reject) => {
				try {
					(0, helpers_1.validateSocksClientOptions)(options, ["connect"]);
				} catch (err) {
					if (typeof callback === "function") {
						callback(err);
						return resolve(err);
					} else return reject(err);
				}
				const client = new SocksClient(options);
				client.connect(options.existing_socket);
				client.once("established", (info) => {
					client.removeAllListeners();
					if (typeof callback === "function") {
						callback(null, info);
						resolve(info);
					} else resolve(info);
				});
				client.once("error", (err) => {
					client.removeAllListeners();
					if (typeof callback === "function") {
						callback(err);
						resolve(err);
					} else reject(err);
				});
			});
		}
		/**
		* Creates a new SOCKS connection chain to a destination host through 2 or more SOCKS proxies.
		*
		* Note: Supports callbacks and promises. Only supports the connect method.
		* Note: Implemented via createConnection() factory function.
		* @param options { SocksClientChainOptions } Options
		* @param callback { Function } An optional callback function.
		* @returns { Promise }
		*/
		static createConnectionChain(options, callback) {
			return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
				try {
					(0, helpers_1.validateSocksClientChainOptions)(options);
				} catch (err) {
					if (typeof callback === "function") {
						callback(err);
						return resolve(err);
					} else return reject(err);
				}
				if (options.randomizeChain) (0, util_1.shuffleArray)(options.proxies);
				try {
					let sock;
					for (let i = 0; i < options.proxies.length; i++) {
						const nextProxy = options.proxies[i];
						const nextDestination = i === options.proxies.length - 1 ? options.destination : {
							host: options.proxies[i + 1].host || options.proxies[i + 1].ipaddress,
							port: options.proxies[i + 1].port
						};
						const result = yield SocksClient.createConnection({
							command: "connect",
							proxy: nextProxy,
							destination: nextDestination,
							existing_socket: sock
						});
						sock = sock || result.socket;
					}
					if (typeof callback === "function") {
						callback(null, { socket: sock });
						resolve({ socket: sock });
					} else resolve({ socket: sock });
				} catch (err) {
					if (typeof callback === "function") {
						callback(err);
						resolve(err);
					} else reject(err);
				}
			}));
		}
		/**
		* Creates a SOCKS UDP Frame.
		* @param options
		*/
		static createUDPFrame(options) {
			const buff = new smart_buffer_1.SmartBuffer();
			buff.writeUInt16BE(0);
			buff.writeUInt8(options.frameNumber || 0);
			if (net.isIPv4(options.remoteHost.host)) {
				buff.writeUInt8(constants_1.Socks5HostType.IPv4);
				buff.writeUInt32BE((0, helpers_1.ipv4ToInt32)(options.remoteHost.host));
			} else if (net.isIPv6(options.remoteHost.host)) {
				buff.writeUInt8(constants_1.Socks5HostType.IPv6);
				buff.writeBuffer((0, helpers_1.ipToBuffer)(options.remoteHost.host));
			} else {
				buff.writeUInt8(constants_1.Socks5HostType.Hostname);
				buff.writeUInt8(Buffer.byteLength(options.remoteHost.host));
				buff.writeString(options.remoteHost.host);
			}
			buff.writeUInt16BE(options.remoteHost.port);
			buff.writeBuffer(options.data);
			return buff.toBuffer();
		}
		/**
		* Parses a SOCKS UDP frame.
		* @param data
		*/
		static parseUDPFrame(data) {
			const buff = smart_buffer_1.SmartBuffer.fromBuffer(data);
			buff.readOffset = 2;
			const frameNumber = buff.readUInt8();
			const hostType = buff.readUInt8();
			let remoteHost;
			if (hostType === constants_1.Socks5HostType.IPv4) remoteHost = (0, helpers_1.int32ToIpv4)(buff.readUInt32BE());
			else if (hostType === constants_1.Socks5HostType.IPv6) remoteHost = ip_address_1.Address6.fromByteArray(Array.from(buff.readBuffer(16))).canonicalForm();
			else remoteHost = buff.readString(buff.readUInt8());
			const remotePort = buff.readUInt16BE();
			return {
				frameNumber,
				remoteHost: {
					host: remoteHost,
					port: remotePort
				},
				data: buff.readBuffer()
			};
		}
		/**
		* Internal state setter. If the SocksClient is in an error state, it cannot be changed to a non error state.
		*/
		setState(newState) {
			if (this.state !== constants_1.SocksClientState.Error) this.state = newState;
		}
		/**
		* Starts the connection establishment to the proxy and destination.
		* @param existingSocket Connected socket to use instead of creating a new one (internal use).
		*/
		connect(existingSocket) {
			this.onDataReceived = (data) => this.onDataReceivedHandler(data);
			this.onClose = () => this.onCloseHandler();
			this.onError = (err) => this.onErrorHandler(err);
			this.onConnect = () => this.onConnectHandler();
			const timer = setTimeout(() => this.onEstablishedTimeout(), this.options.timeout || constants_1.DEFAULT_TIMEOUT);
			if (timer.unref && typeof timer.unref === "function") timer.unref();
			if (existingSocket) this.socket = existingSocket;
			else this.socket = new net.Socket();
			this.socket.once("close", this.onClose);
			this.socket.once("error", this.onError);
			this.socket.once("connect", this.onConnect);
			this.socket.on("data", this.onDataReceived);
			this.setState(constants_1.SocksClientState.Connecting);
			this.receiveBuffer = new receivebuffer_1.ReceiveBuffer();
			if (existingSocket) this.socket.emit("connect");
			else {
				this.socket.connect(this.getSocketOptions());
				if (this.options.set_tcp_nodelay !== void 0 && this.options.set_tcp_nodelay !== null) this.socket.setNoDelay(!!this.options.set_tcp_nodelay);
			}
			this.prependOnceListener("established", (info) => {
				setImmediate(() => {
					if (this.receiveBuffer.length > 0) {
						const excessData = this.receiveBuffer.get(this.receiveBuffer.length);
						info.socket.emit("data", excessData);
					}
					info.socket.resume();
				});
			});
		}
		getSocketOptions() {
			return Object.assign(Object.assign({}, this.options.socket_options), {
				host: this.options.proxy.host || this.options.proxy.ipaddress,
				port: this.options.proxy.port
			});
		}
		/**
		* Handles internal Socks timeout callback.
		* Note: If the Socks client is not BoundWaitingForConnection or Established, the connection will be closed.
		*/
		onEstablishedTimeout() {
			if (this.state !== constants_1.SocksClientState.Established && this.state !== constants_1.SocksClientState.BoundWaitingForConnection) this.closeSocket(constants_1.ERRORS.ProxyConnectionTimedOut);
		}
		/**
		* Handles Socket connect event.
		*/
		onConnectHandler() {
			this.setState(constants_1.SocksClientState.Connected);
			if (this.options.proxy.type === 4) this.sendSocks4InitialHandshake();
			else this.sendSocks5InitialHandshake();
			this.setState(constants_1.SocksClientState.SentInitialHandshake);
		}
		/**
		* Handles Socket data event.
		* @param data
		*/
		onDataReceivedHandler(data) {
			this.receiveBuffer.append(data);
			this.processData();
		}
		/**
		* Handles processing of the data we have received.
		*/
		processData() {
			while (this.state !== constants_1.SocksClientState.Established && this.state !== constants_1.SocksClientState.Error && this.receiveBuffer.length >= this.nextRequiredPacketBufferSize) if (this.state === constants_1.SocksClientState.SentInitialHandshake) {
				if (this.options.proxy.type === 4) this.handleSocks4FinalHandshakeResponse();
				else this.handleInitialSocks5HandshakeResponse();
			} else if (this.state === constants_1.SocksClientState.SentAuthentication) this.handleInitialSocks5AuthenticationHandshakeResponse();
			else if (this.state === constants_1.SocksClientState.SentFinalHandshake) this.handleSocks5FinalHandshakeResponse();
			else if (this.state === constants_1.SocksClientState.BoundWaitingForConnection) {
				if (this.options.proxy.type === 4) this.handleSocks4IncomingConnectionResponse();
				else this.handleSocks5IncomingConnectionResponse();
			} else {
				this.closeSocket(constants_1.ERRORS.InternalError);
				break;
			}
		}
		/**
		* Handles Socket close event.
		* @param had_error
		*/
		onCloseHandler() {
			this.closeSocket(constants_1.ERRORS.SocketClosed);
		}
		/**
		* Handles Socket error event.
		* @param err
		*/
		onErrorHandler(err) {
			this.closeSocket(err.message);
		}
		/**
		* Removes internal event listeners on the underlying Socket.
		*/
		removeInternalSocketHandlers() {
			this.socket.pause();
			this.socket.removeListener("data", this.onDataReceived);
			this.socket.removeListener("close", this.onClose);
			this.socket.removeListener("error", this.onError);
			this.socket.removeListener("connect", this.onConnect);
		}
		/**
		* Closes and destroys the underlying Socket. Emits an error event.
		* @param err { String } An error string to include in error event.
		*/
		closeSocket(err) {
			if (this.state !== constants_1.SocksClientState.Error) {
				this.setState(constants_1.SocksClientState.Error);
				this.socket.destroy();
				this.removeInternalSocketHandlers();
				this.emit("error", new util_1.SocksClientError(err, this.options));
			}
		}
		/**
		* Sends initial Socks v4 handshake request.
		*/
		sendSocks4InitialHandshake() {
			const userId = this.options.proxy.userId || "";
			const buff = new smart_buffer_1.SmartBuffer();
			buff.writeUInt8(4);
			buff.writeUInt8(constants_1.SocksCommand[this.options.command]);
			buff.writeUInt16BE(this.options.destination.port);
			if (net.isIPv4(this.options.destination.host)) {
				buff.writeBuffer((0, helpers_1.ipToBuffer)(this.options.destination.host));
				buff.writeStringNT(userId);
			} else {
				buff.writeUInt8(0);
				buff.writeUInt8(0);
				buff.writeUInt8(0);
				buff.writeUInt8(1);
				buff.writeStringNT(userId);
				buff.writeStringNT(this.options.destination.host);
			}
			this.nextRequiredPacketBufferSize = constants_1.SOCKS_INCOMING_PACKET_SIZES.Socks4Response;
			this.socket.write(buff.toBuffer());
		}
		/**
		* Handles Socks v4 handshake response.
		* @param data
		*/
		handleSocks4FinalHandshakeResponse() {
			const data = this.receiveBuffer.get(8);
			if (data[1] !== constants_1.Socks4Response.Granted) this.closeSocket(`${constants_1.ERRORS.Socks4ProxyRejectedConnection} - (${constants_1.Socks4Response[data[1]]})`);
			else if (constants_1.SocksCommand[this.options.command] === constants_1.SocksCommand.bind) {
				const buff = smart_buffer_1.SmartBuffer.fromBuffer(data);
				buff.readOffset = 2;
				const remoteHost = {
					port: buff.readUInt16BE(),
					host: (0, helpers_1.int32ToIpv4)(buff.readUInt32BE())
				};
				if (remoteHost.host === "0.0.0.0") remoteHost.host = this.options.proxy.ipaddress;
				this.setState(constants_1.SocksClientState.BoundWaitingForConnection);
				this.emit("bound", {
					remoteHost,
					socket: this.socket
				});
			} else {
				this.setState(constants_1.SocksClientState.Established);
				this.removeInternalSocketHandlers();
				this.emit("established", { socket: this.socket });
			}
		}
		/**
		* Handles Socks v4 incoming connection request (BIND)
		* @param data
		*/
		handleSocks4IncomingConnectionResponse() {
			const data = this.receiveBuffer.get(8);
			if (data[1] !== constants_1.Socks4Response.Granted) this.closeSocket(`${constants_1.ERRORS.Socks4ProxyRejectedIncomingBoundConnection} - (${constants_1.Socks4Response[data[1]]})`);
			else {
				const buff = smart_buffer_1.SmartBuffer.fromBuffer(data);
				buff.readOffset = 2;
				const remoteHost = {
					port: buff.readUInt16BE(),
					host: (0, helpers_1.int32ToIpv4)(buff.readUInt32BE())
				};
				this.setState(constants_1.SocksClientState.Established);
				this.removeInternalSocketHandlers();
				this.emit("established", {
					remoteHost,
					socket: this.socket
				});
			}
		}
		/**
		* Sends initial Socks v5 handshake request.
		*/
		sendSocks5InitialHandshake() {
			const buff = new smart_buffer_1.SmartBuffer();
			const supportedAuthMethods = [constants_1.Socks5Auth.NoAuth];
			if (this.options.proxy.userId || this.options.proxy.password) supportedAuthMethods.push(constants_1.Socks5Auth.UserPass);
			if (this.options.proxy.custom_auth_method !== void 0) supportedAuthMethods.push(this.options.proxy.custom_auth_method);
			buff.writeUInt8(5);
			buff.writeUInt8(supportedAuthMethods.length);
			for (const authMethod of supportedAuthMethods) buff.writeUInt8(authMethod);
			this.nextRequiredPacketBufferSize = constants_1.SOCKS_INCOMING_PACKET_SIZES.Socks5InitialHandshakeResponse;
			this.socket.write(buff.toBuffer());
			this.setState(constants_1.SocksClientState.SentInitialHandshake);
		}
		/**
		* Handles initial Socks v5 handshake response.
		* @param data
		*/
		handleInitialSocks5HandshakeResponse() {
			const data = this.receiveBuffer.get(2);
			if (data[0] !== 5) this.closeSocket(constants_1.ERRORS.InvalidSocks5IntiailHandshakeSocksVersion);
			else if (data[1] === constants_1.SOCKS5_NO_ACCEPTABLE_AUTH) this.closeSocket(constants_1.ERRORS.InvalidSocks5InitialHandshakeNoAcceptedAuthType);
			else if (data[1] === constants_1.Socks5Auth.NoAuth) {
				this.socks5ChosenAuthType = constants_1.Socks5Auth.NoAuth;
				this.sendSocks5CommandRequest();
			} else if (data[1] === constants_1.Socks5Auth.UserPass) {
				this.socks5ChosenAuthType = constants_1.Socks5Auth.UserPass;
				this.sendSocks5UserPassAuthentication();
			} else if (data[1] === this.options.proxy.custom_auth_method) {
				this.socks5ChosenAuthType = this.options.proxy.custom_auth_method;
				this.sendSocks5CustomAuthentication();
			} else this.closeSocket(constants_1.ERRORS.InvalidSocks5InitialHandshakeUnknownAuthType);
		}
		/**
		* Sends Socks v5 user & password auth handshake.
		*
		* Note: No auth and user/pass are currently supported.
		*/
		sendSocks5UserPassAuthentication() {
			const userId = this.options.proxy.userId || "";
			const password = this.options.proxy.password || "";
			const buff = new smart_buffer_1.SmartBuffer();
			buff.writeUInt8(1);
			buff.writeUInt8(Buffer.byteLength(userId));
			buff.writeString(userId);
			buff.writeUInt8(Buffer.byteLength(password));
			buff.writeString(password);
			this.nextRequiredPacketBufferSize = constants_1.SOCKS_INCOMING_PACKET_SIZES.Socks5UserPassAuthenticationResponse;
			this.socket.write(buff.toBuffer());
			this.setState(constants_1.SocksClientState.SentAuthentication);
		}
		sendSocks5CustomAuthentication() {
			return __awaiter(this, void 0, void 0, function* () {
				this.nextRequiredPacketBufferSize = this.options.proxy.custom_auth_response_size;
				this.socket.write(yield this.options.proxy.custom_auth_request_handler());
				this.setState(constants_1.SocksClientState.SentAuthentication);
			});
		}
		handleSocks5CustomAuthHandshakeResponse(data) {
			return __awaiter(this, void 0, void 0, function* () {
				return yield this.options.proxy.custom_auth_response_handler(data);
			});
		}
		handleSocks5AuthenticationNoAuthHandshakeResponse(data) {
			return __awaiter(this, void 0, void 0, function* () {
				return data[1] === 0;
			});
		}
		handleSocks5AuthenticationUserPassHandshakeResponse(data) {
			return __awaiter(this, void 0, void 0, function* () {
				return data[1] === 0;
			});
		}
		/**
		* Handles Socks v5 auth handshake response.
		* @param data
		*/
		handleInitialSocks5AuthenticationHandshakeResponse() {
			return __awaiter(this, void 0, void 0, function* () {
				this.setState(constants_1.SocksClientState.ReceivedAuthenticationResponse);
				let authResult = false;
				if (this.socks5ChosenAuthType === constants_1.Socks5Auth.NoAuth) authResult = yield this.handleSocks5AuthenticationNoAuthHandshakeResponse(this.receiveBuffer.get(2));
				else if (this.socks5ChosenAuthType === constants_1.Socks5Auth.UserPass) authResult = yield this.handleSocks5AuthenticationUserPassHandshakeResponse(this.receiveBuffer.get(2));
				else if (this.socks5ChosenAuthType === this.options.proxy.custom_auth_method) authResult = yield this.handleSocks5CustomAuthHandshakeResponse(this.receiveBuffer.get(this.options.proxy.custom_auth_response_size));
				if (!authResult) this.closeSocket(constants_1.ERRORS.Socks5AuthenticationFailed);
				else this.sendSocks5CommandRequest();
			});
		}
		/**
		* Sends Socks v5 final handshake request.
		*/
		sendSocks5CommandRequest() {
			const buff = new smart_buffer_1.SmartBuffer();
			buff.writeUInt8(5);
			buff.writeUInt8(constants_1.SocksCommand[this.options.command]);
			buff.writeUInt8(0);
			if (net.isIPv4(this.options.destination.host)) {
				buff.writeUInt8(constants_1.Socks5HostType.IPv4);
				buff.writeBuffer((0, helpers_1.ipToBuffer)(this.options.destination.host));
			} else if (net.isIPv6(this.options.destination.host)) {
				buff.writeUInt8(constants_1.Socks5HostType.IPv6);
				buff.writeBuffer((0, helpers_1.ipToBuffer)(this.options.destination.host));
			} else {
				buff.writeUInt8(constants_1.Socks5HostType.Hostname);
				buff.writeUInt8(this.options.destination.host.length);
				buff.writeString(this.options.destination.host);
			}
			buff.writeUInt16BE(this.options.destination.port);
			this.nextRequiredPacketBufferSize = constants_1.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseHeader;
			this.socket.write(buff.toBuffer());
			this.setState(constants_1.SocksClientState.SentFinalHandshake);
		}
		/**
		* Handles Socks v5 final handshake response.
		* @param data
		*/
		handleSocks5FinalHandshakeResponse() {
			const header = this.receiveBuffer.peek(5);
			if (header[0] !== 5 || header[1] !== constants_1.Socks5Response.Granted) this.closeSocket(`${constants_1.ERRORS.InvalidSocks5FinalHandshakeRejected} - ${constants_1.Socks5Response[header[1]]}`);
			else {
				const addressType = header[3];
				let remoteHost;
				let buff;
				if (addressType === constants_1.Socks5HostType.IPv4) {
					const dataNeeded = constants_1.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseIPv4;
					if (this.receiveBuffer.length < dataNeeded) {
						this.nextRequiredPacketBufferSize = dataNeeded;
						return;
					}
					buff = smart_buffer_1.SmartBuffer.fromBuffer(this.receiveBuffer.get(dataNeeded).slice(4));
					remoteHost = {
						host: (0, helpers_1.int32ToIpv4)(buff.readUInt32BE()),
						port: buff.readUInt16BE()
					};
					if (remoteHost.host === "0.0.0.0") remoteHost.host = this.options.proxy.ipaddress;
				} else if (addressType === constants_1.Socks5HostType.Hostname) {
					const hostLength = header[4];
					const dataNeeded = constants_1.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseHostname(hostLength);
					if (this.receiveBuffer.length < dataNeeded) {
						this.nextRequiredPacketBufferSize = dataNeeded;
						return;
					}
					buff = smart_buffer_1.SmartBuffer.fromBuffer(this.receiveBuffer.get(dataNeeded).slice(5));
					remoteHost = {
						host: buff.readString(hostLength),
						port: buff.readUInt16BE()
					};
				} else if (addressType === constants_1.Socks5HostType.IPv6) {
					const dataNeeded = constants_1.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseIPv6;
					if (this.receiveBuffer.length < dataNeeded) {
						this.nextRequiredPacketBufferSize = dataNeeded;
						return;
					}
					buff = smart_buffer_1.SmartBuffer.fromBuffer(this.receiveBuffer.get(dataNeeded).slice(4));
					remoteHost = {
						host: ip_address_1.Address6.fromByteArray(Array.from(buff.readBuffer(16))).canonicalForm(),
						port: buff.readUInt16BE()
					};
				}
				this.setState(constants_1.SocksClientState.ReceivedFinalResponse);
				if (constants_1.SocksCommand[this.options.command] === constants_1.SocksCommand.connect) {
					this.setState(constants_1.SocksClientState.Established);
					this.removeInternalSocketHandlers();
					this.emit("established", {
						remoteHost,
						socket: this.socket
					});
				} else if (constants_1.SocksCommand[this.options.command] === constants_1.SocksCommand.bind) {
					this.setState(constants_1.SocksClientState.BoundWaitingForConnection);
					this.nextRequiredPacketBufferSize = constants_1.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseHeader;
					this.emit("bound", {
						remoteHost,
						socket: this.socket
					});
				} else if (constants_1.SocksCommand[this.options.command] === constants_1.SocksCommand.associate) {
					this.setState(constants_1.SocksClientState.Established);
					this.removeInternalSocketHandlers();
					this.emit("established", {
						remoteHost,
						socket: this.socket
					});
				}
			}
		}
		/**
		* Handles Socks v5 incoming connection request (BIND).
		*/
		handleSocks5IncomingConnectionResponse() {
			const header = this.receiveBuffer.peek(5);
			if (header[0] !== 5 || header[1] !== constants_1.Socks5Response.Granted) this.closeSocket(`${constants_1.ERRORS.Socks5ProxyRejectedIncomingBoundConnection} - ${constants_1.Socks5Response[header[1]]}`);
			else {
				const addressType = header[3];
				let remoteHost;
				let buff;
				if (addressType === constants_1.Socks5HostType.IPv4) {
					const dataNeeded = constants_1.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseIPv4;
					if (this.receiveBuffer.length < dataNeeded) {
						this.nextRequiredPacketBufferSize = dataNeeded;
						return;
					}
					buff = smart_buffer_1.SmartBuffer.fromBuffer(this.receiveBuffer.get(dataNeeded).slice(4));
					remoteHost = {
						host: (0, helpers_1.int32ToIpv4)(buff.readUInt32BE()),
						port: buff.readUInt16BE()
					};
					if (remoteHost.host === "0.0.0.0") remoteHost.host = this.options.proxy.ipaddress;
				} else if (addressType === constants_1.Socks5HostType.Hostname) {
					const hostLength = header[4];
					const dataNeeded = constants_1.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseHostname(hostLength);
					if (this.receiveBuffer.length < dataNeeded) {
						this.nextRequiredPacketBufferSize = dataNeeded;
						return;
					}
					buff = smart_buffer_1.SmartBuffer.fromBuffer(this.receiveBuffer.get(dataNeeded).slice(5));
					remoteHost = {
						host: buff.readString(hostLength),
						port: buff.readUInt16BE()
					};
				} else if (addressType === constants_1.Socks5HostType.IPv6) {
					const dataNeeded = constants_1.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseIPv6;
					if (this.receiveBuffer.length < dataNeeded) {
						this.nextRequiredPacketBufferSize = dataNeeded;
						return;
					}
					buff = smart_buffer_1.SmartBuffer.fromBuffer(this.receiveBuffer.get(dataNeeded).slice(4));
					remoteHost = {
						host: ip_address_1.Address6.fromByteArray(Array.from(buff.readBuffer(16))).canonicalForm(),
						port: buff.readUInt16BE()
					};
				}
				this.setState(constants_1.SocksClientState.Established);
				this.removeInternalSocketHandlers();
				this.emit("established", {
					remoteHost,
					socket: this.socket
				});
			}
		}
		get socksClientOptions() {
			return Object.assign({}, this.options);
		}
	};
}));
//#endregion
//#region node_modules/socks/build/index.js
var require_build = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __exportStar = exports && exports.__exportStar || function(m, exports$1) {
		for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$1, p)) __createBinding(exports$1, m, p);
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	__exportStar(require_socksclient(), exports);
}));
//#endregion
export { require_build as t };
