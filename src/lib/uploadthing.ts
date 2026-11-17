import { generateReactHelpers } from '@uploadthing/react';
import type { RoomPhotoRouter } from '@/app/api/uploadthing/core';

export const { useUploadThing } = generateReactHelpers<RoomPhotoRouter>();
