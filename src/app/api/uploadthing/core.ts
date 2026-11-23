import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { can, getCurrentUser } from '@/lib/access';

const upload = createUploadthing();

export const roomPhotoRouter = {
  roomPhoto: upload({ image: { maxFileSize: '8MB', maxFileCount: 1 } })
    .middleware(async () => {
      const user = await getCurrentUser();
      if (!user || !(can(user, 'rooms:create') || can(user, 'rooms:update'))) {
        throw new UploadThingError({ code: 'FORBIDDEN', message: 'Only room editors can upload photos.' });
      }
      return { uploadedBy: user.id };
    })
    .onUploadComplete(({ metadata }) => ({ uploadedBy: metadata.uploadedBy })),
} satisfies FileRouter;

export type RoomPhotoRouter = typeof roomPhotoRouter;
