Node Icecast Server
===

This package provides you with a set of class and functions to handle HTTP/Icecast from a TCP server or stream.    
It acts as an actual Icecast server, takes input from a source, keeps
connections alive, parses metadata and emits events so you can plug
anything anywhere.

The server has no audio backend tho, and will let you handle the raw
mounts audio streams as you wish. 

Metadata parsing is done using the wonderful `music-metadata` library.

## Usage

```sh
yarn add @timlebrun/icecast-server
```

```ts
import { IcecastServer, IcecastMount, IMetadata } from '@timlebrun/icecast-server';

const icecast = new IcecastServer();

icecast.on('mount', (mount: IcecastMount) => {
  mount.on('metadata', (metadata: IMetadata) => console.log(`Artist : ${metadata.common.artist}`);
  mount.audioStream.pipe(toSomeStream);
});

icecast.listen(78543); // Some random port
```

## Roadmap

- [x] Push on NPM
- [x] Add examples
- [ ] Add documentation

## License

Even though this package is under MIT license, I'd rather be notified before any commercial use.