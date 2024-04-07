import ffmpeg from 'fluent-ffmpeg';
import { resolve } from 'path';

import { IcecastServer, IIcecastServerMountEvent, IIcecastMountAudioMetadata } from '../src';

const dataPath = resolve(__dirname, '..', 'data');

const baseEncoder = ffmpeg()
	.outputOption('-hls_segment_type mpegts')
	.outputOption('-hls_list_size 3')
	.outputOption('-hls_time 4')
	.audioBitrate('64k')
	.audioChannels(2)
	.audioCodec('aac')
	.format('hls')
	.noVideo();

const icecast = new IcecastServer();

icecast.on('connection', () => console.log(`Received Connection !`));
icecast.on('head', (head) => console.log(`Received a proper HTTP head `, head));
icecast.on('error', (e) => console.error('oh no', e));
icecast.on('mount', (event: IIcecastServerMountEvent) => {
	const mount = event.mount;
	console.log(`Received mount ${event.id} !`);

	mount.on('metadata', (metadata: IIcecastMountAudioMetadata) =>
		console.log('metadata updated', metadata.common.artist),
	);
	mount.on('end', () => console.log('mount ended !'));
	mount.on('error', () => console.log('mount error'));

	const encoder = baseEncoder
		.clone()
		.addInput(mount.audioStream) // FFmpeg auto detects audio format
		.addOutput(`${dataPath}/${event.id}.m3u8`)
		.outputOption(`-hls_segment_filename ${dataPath}/audio_${event.id}_%03d.ts`);

	encoder
		.on('start', () => console.log('encoding started !'))
		.on('codecData', (data: any) => console.log(`Input codec is ${data.audio}`))
		.on('progress', (progress: any) => console.log(`Processing time: ${progress.timemark}`))
		.on('error', (e: any) => console.log('encoding error', e))
		.on('end', () => console.log('encoding ended'));

	encoder.run();
});

icecast.listen(8466); // Some random port
