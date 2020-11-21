import { IAudioMetadata } from 'music-metadata';

export type IAuthenticator = (username: string, password: string, head: any) => boolean;
export type IMetadata = IAudioMetadata;