import { Socket, Server as TcpServer } from 'net';
import { default as parseHttpHead, RequestData as ParsedRequestHead } from 'http-headers';
import { EventEmitter } from 'events';

import { IcecastMount } from './mount';

/**
 * Icecast Server class
 *
 * Handles the (manual) parsing of incoming TCP connections
 * and forwarding to Icecast "mounts"
 */
export class IcecastServer extends EventEmitter {
	/**
	 * Underlying TCP server instance
	 */
	private _server?: TcpServer;
	get server() {
		return this._server;
	}

	/**
	 * A map of mounts
	 */
	public readonly mounts = new Map<string, IcecastMount>();

	/**
	 * The authenticator callback
	 */
	private authenticator: IIcecastServerAuthenticator = () => true;

	constructor(public readonly options: any = {}) {
		super();
	}

	/**
	 * Replaces authenticator callback
	 *
	 * @param callback
	 */
	public setAuthenticator(callback: IIcecastServerAuthenticator) {
		this.authenticator = callback;

		return this;
	}

	/**
	 * Handles an incoming TCP connection
	 *
	 * @param socket
	 */
	public handleConnection(socket: Socket) {
		socket.once('data', (maybeHeaderData) => {
			try {
				const request = IcecastServerRequest.fromConnection(maybeHeaderData, socket);

				// on IcecastServerHttpError, close socket

				this.handleRequest(request);
			} catch (error) {
				this.emit('error', error);

				const payload =
					error instanceof IcecastServerHttpError
						? IcecastServer.generateHttpResponseHead(error.code, error.message)
						: IcecastServer.generateHttpResponseHead(500, 'Unknown error');

				return socket.end(payload);
			}
		});
	}

	/**
	 * Handles a (kinda) proper HTTP request
	 *
	 * @param head
	 * @param socket
	 */
	public handleRequest(request: IcecastServerRequest) {
		if (request.head.method !== 'PUT') throw new IcecastServerHttpError(405, 'Invalid method');

		const authenticationCredentials = request.parseBasicAuthenticationHeader();
		if (!authenticationCredentials)
			throw new IcecastServerHttpError(401, 'You need to authenticate');

		const authenticationContext = this.authenticator(authenticationCredentials, request);
		if (!authenticationContext) throw new IcecastServerHttpError(403, 'Forbidden');

		const mountId = request.head.url.substring(1);
		if (!mountId || mountId == '')
			throw new IcecastServerHttpError(400, 'You cannot mount at root');

		const mount = new IcecastMount(request, authenticationContext);
		this.handleMount(mountId, mount);

		const continueStatus = IcecastServer.generateHttpResponseHead(100, 'Continue', false);
		request.socket.write(continueStatus + '\n');
	}

	/**
	 * Handles a newly created mount
	 *
	 * @param id
	 * @param mount
	 */
	private handleMount(id: string, mount: IcecastMount) {
		this.mounts.set(id, mount);

		const mountEvent: IIcecastServerMountEvent = { id, mount };
		this.emit('mount', mountEvent);
	}

	/**
	 * Gracefully close mounts, then the server.
	 *
	 * @param callback
	 */
	public close(callback: () => void) {
		// Gracefully close all mounts before closing server
		for (const mount of this.mounts.values()) mount.close();

		if (this._server) this._server.close(callback);
	}

	/**
	 * Starts listening to TCP input on specified port (defaults to `8000`)
	 *
	 * Creates a new TCP Server if needed.
	 *
	 * @param port
	 */
	public listen(port: number = 8000) {
		if (!this._server) this._server = new TcpServer((socket) => this.handleConnection(socket));

		this._server.listen(port, () => console.log('listenign'));
	}

	public static generateHttpResponseHead(
		statusCode: number,
		statusMessage: string,
		end = true,
	) {
		return `HTTP/1.1 ${statusCode} ${statusMessage}\n${end ? '\n' : ''}`;
	}
}

export class IcecastServerRequest {
	public constructor(
		public readonly socket: Socket,
		public readonly head: ParsedRequestHead,
	) {}

	public parseBasicAuthenticationHeader(): IIcecastServerRequestAuthenticationCredentials | null {
		const authorizationHeader = this.head.headers['authorization'];
		if (!authorizationHeader) return null;

		// @todo maybe add checks ?
		const payload = authorizationHeader.replace('Basic ', '');
		const decoded = Buffer.from(payload, 'base64').toString('utf-8');
		const [username, password] = decoded.split(':');

		return { username, password };
	}

	public getHeader(key: string) {
		return this.head.headers[key] ?? null;
	}

	/**
	 * Builds a request instance from an incoming connection
	 *
	 * Requires the connection socket and first received data (to be parsed)
	 *
	 * @param firstData
	 * @param socket
	 * @returns an instance of the Request
	 */
	public static fromConnection(firstData: Buffer, socket: Socket) {
		const head = parseHttpHead(firstData) as ParsedRequestHead;
		if (!head) throw new IcecastServerHttpError(400, 'Wtf');

		return new this(socket, head);
	}
}

export class IcecastServerHttpError extends Error {
	constructor(
		public readonly code: number,
		public readonly message: string,
	) {
		super();
	}
}

export interface IIcecastServerRequestAuthenticationCredentials {
	username: string;
	password: string;
}

export type IIcecastServerAuthenticator = (
	credentials: IIcecastServerRequestAuthenticationCredentials,
	request: IcecastServerRequest,
) => boolean | any;

export interface IIcecastServerMountEvent {
	id: string;
	mount: IcecastMount;
}
