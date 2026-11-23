import { createRouteHandler } from 'uploadthing/next';
import { roomPhotoRouter } from './core';

export const { GET, POST } = createRouteHandler({ router: roomPhotoRouter });
