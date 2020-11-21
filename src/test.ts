import { IcecastServer } from './server';
import { IcecastMount } from './mount';
import { IMetadata } from './interfaces';

const icecast = new IcecastServer();

icecast.on('connection', () => console.log(`Received Connection !`));
icecast.on('head', (head) => console.log(`Received a proper HTTP head `, head));
icecast.on('mount', (id, mount: IcecastMount) => {
  console.log(`Received mount ${id} !`);
  mount.on('metadata', (metadata: IMetadata) => console.log('metadata updated', metadata));
  mount.on('end', () => console.log('mount ended !'));
  mount.on('error', () => console.log('mount error'));
});
icecast.on('error', e => console.error('oh no', e));

icecast.listen(8466);