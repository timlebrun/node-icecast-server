import { Socket } from 'net';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { Socket } from 'net';

import { parseStream as parseStreamMetadata } from 'music-metadata';
import { IAudioMetadata, IMetadataEvent } from 'music-metadata/lib/type';

import { generateHttpHead } from './helpers';

export class IcecastMount extends EventEmitter {

  public lastMetadata: IAudioMetadata = null;
  public readonly audioStream = new PassThrough();
  // private readonly parser = new IcecastParser(8192);
  // public readonly audio = this.stream.pipe(this.parser);

  constructor(
    public readonly stream: Socket,
    public readonly headers: any
  ) {
    super();

    this.stream.on('error', e => this.onError(e));
    this.stream.on('close', () => this.onClose());
    this.stream.on('end', () => this.onEnd());

    const metadataPassthough = new PassThrough();
    this.stream.pipe(metadataPassthough);
    this.stream.pipe(this.audioStream);

    parseStreamMetadata(metadataPassthough,
      { mimeType: this.getMimeType() },
      { observer: e => this.onMetadata(e) }
    );
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

  public getType() {
    return this.headers['content-type'];
  }

  public getAgent() {
    return this.headers['user-agent'];
  }

  public isPublic() {
    return this.headers['ice-public'];
  }

  private onEnd() {
    // console.log('mount ended !');
    // not sure yet between close and end
  }

  private onError(error: Error) {
    this.stream.end(generateHttpHead(500, 'Oh no bye...'));

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
    this.stream.end(generateHttpHead(200, 'Thx bye <3'));
    // do stuff ?
  }
}