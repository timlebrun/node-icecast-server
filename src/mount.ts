import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

import { parseStream as parseStreamMetadata } from 'music-metadata';
import { IAudioMetadata, IMetadataEvent } from 'music-metadata/lib/type';

import { IcecastServer, IcecastServerRequest } from './server';

export class IcecastMount extends EventEmitter {
	public lastMetadata: IAudioMetadata = null;
	public readonly audioStream = new PassThrough();

	constructor(
		public readonly request: IcecastServerRequest,
		public readonly authenticationContext: any,
	) {
		super();

		this.request.socket.on('error', (e) => this.onError(e));
		this.request.socket.on('close', () => this.onClose());
		this.request.socket.on('end', () => this.onEnd());

		const metadataPassthough = new PassThrough();
		this.request.socket.pipe(metadataPassthough);
		this.request.socket.pipe(this.audioStream);

		parseStreamMetadata(
			metadataPassthough,
			{ mimeType: this.getMimeType() },
			{ observer: (e) => this.onMetadata(e) },
		);
	}

	public getStatus() {
		return this.audioStream.readableEnded;
	}

	public getCurrentArtist() {
		return this.lastMetadata ? this.lastMetadata.common.artist : null;
	}

	public getCurrentTitle() {
		return this.lastMetadata ? this.lastMetadata.common.title : null;
	}

	public getCurrentAlbum() {
		return this.lastMetadata ? this.lastMetadata.common.title : null;
	}

	public getMimeType() {
		return this.request.getHeader('content-type');
	}

	public getType() {
		return this.getMimeType().replace('audio/', '').replace('video/', '');
	}

	public getAgent() {
		return this.request.getHeader('user-agent');
	}

	public isPublic() {
		return this.request.getHeader('ice-public');
	}

	private onEnd() {
		// console.log('mount ended !');
		// not sure yet between close and end
	}

	private onError(error: Error) {
		this.request.socket.end(IcecastServer.generateHttpResponseHead(500, 'Oh no bye...'));

		this.emit('error', error);
	}

	private onClose() {
		// console.log('mount closed !');
		// not sure yet between end and close
	}

	private onMetadata(metadata: IMetadataEvent) {
		this.lastMetadata = metadata.metadata;

		this.emit('metadata', this.lastMetadata);
	}

	public close() {
		this.request.socket.end(IcecastServer.generateHttpResponseHead(200, 'Thx bye <3'));
		// do stuff ?
	}
}

export type IIcecastMountAudioMetadata = IAudioMetadata;
