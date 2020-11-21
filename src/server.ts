import { Socket, Server as TcpServer } from 'net';
// @ts-ignore
import parseHttpHead from 'http-headers';
import { EventEmitter } from 'events';

import { generateHttpHead, parseBasicAuthenticationHeader } from './helpers';
import { IAuthenticator } from './interfaces';
import { IcecastMount } from './mount';
import { HttpError } from './error';

export class IcecastServer extends EventEmitter {

  /**
   * Underlying TCP server instance
   */
  private _server?: TcpServer;
  get server () { return this._server; }

  /**
   * A map of mounts
   */
  public readonly mounts = new Map<string, IcecastMount>();

  /**
   * The authenticator callback
   */
  private authenticator: IAuthenticator = () => true;

  constructor(
    public readonly options: any = {},
  ) { super(); }

  /**
   * Replaces authenticator callback
   * 
   * @param callback 
   */
  public setAuthenticator(callback: IAuthenticator) {
    this.authenticator = callback;

    return this;
  }

  /**
   * Handles an incoming TCP connection
   * 
   * @param socket 
   */
  public handleConnection(socket: Socket) {
    socket.once('data', maybeHeaderData => {
      try {
        const head = parseHttpHead(maybeHeaderData);

        if (!head) throw new HttpError(400, 'Wtf');
        this.emit('head', head);

        this.handleRequest(head, socket);
      }
      catch (error) {
        this.emit('error', error);

        const payload = error instanceof HttpError
          ? generateHttpHead(error.code, error.message)
          : generateHttpHead(500, 'Unknown error');
        
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
  public handleRequest(head: any, socket: Socket) {
    if (head.method != 'PUT') throw new HttpError(405, 'Invalid method');
    if (!head.headers.authorization) throw new HttpError(401, 'You need to authenticate');

    const authorization = parseBasicAuthenticationHeader(head.headers.authorization);
    if (!authorization) throw new HttpError(403, 'Authorization failed');

    const authenticationIsOk = this.authenticator(authorization.username, authorization.password, head);
    if (!authenticationIsOk) throw new HttpError(403, 'Forbidden');

    const mountId = head.url.substring(1);
    if (!mountId || mountId == '') throw new HttpError(400, 'You cannot mount at root');
    const mount = new IcecastMount(socket, head.headers);
    this.handleMount(mountId, mount);

    const continueStatus = generateHttpHead(100, 'Continue', false);
    socket.write(continueStatus + '\n');    
  }

  /**
   * Handles a newly created mount
   * 
   * @param id 
   * @param mount 
   */
  private handleMount(id: string, mount: IcecastMount) {
    this.mounts.set(id, mount);

    this.emit('mount', id, mount);
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
    if (!this._server) this._server = new TcpServer(socket => this.handleConnection(socket));
    
    this._server.listen(port, () => console.log('listenign'));
  }
}
