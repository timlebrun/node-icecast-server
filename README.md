Node Icecast Server
===

This package provides you with a set of class and functions to parse HTTP/Icecast from a TCP server or stream.    
It acts as an actual Icecast server, takes input from a source, keeps
connections alive, parses metadata and emits events so you can plug
anything anywhere.

The server has no audio backend tho, and will let you handle the raw
mounts audio streams as you wish. 

Metadata parsing is done using the wonderful `music-metadata` library.

## Usage

```sh
yarn add icecast-server # Will not work for now
```

## Example

```sh
# This is awkward...
```

## Roadmap

- [ ] Push on NPM
- [ ] Add documentation
- [ ] Add examples