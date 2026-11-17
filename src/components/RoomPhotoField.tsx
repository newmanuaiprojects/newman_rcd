'use client';

import Image from 'next/image';
import { useState, type ChangeEvent } from 'react';
import { useUploadThing } from '@/lib/uploadthing';

interface RoomPhotoFieldProps {
  name: 'photoFront' | 'photoBack';
  label: string;
  initialUrl: string | null;
  error?: string;
  onUploadingChange: (uploading: boolean) => void;
}

export function RoomPhotoField({ name, label, initialUrl, error, onUploadingChange }: RoomPhotoFieldProps) {
  const [url, setUrl] = useState(initialUrl);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { startUpload, isUploading } = useUploadThing('roomPhoto', {
    onUploadBegin: () => onUploadingChange(true),
    onClientUploadComplete: (files) => {
      setUrl(files.at(0)?.ufsUrl ?? url);
      setUploadError(null);
      onUploadingChange(false);
    },
    onUploadError: (failure) => {
      setUploadError(failure.message);
      onUploadingChange(false);
    },
  });

  const inputId = `${name}-file`;
  const errorId = `${name}-error`;
  const shownError = uploadError ?? error;

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.item(0);
    event.target.value = '';
    if (file) startUpload([file]);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <input type="hidden" name={name} value={url ?? ''} />
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
        {url ? (
          <Image src={url} alt={`${label} of the room`} fill sizes="(min-width: 640px) 360px, 100vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">No photo</div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          id={inputId}
          type="file"
          accept="image/*"
          disabled={isUploading}
          onChange={choose}
          aria-describedby={shownError ? errorId : undefined}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-disabled:cursor-wait peer-disabled:opacity-60"
        >
          {isUploading ? 'Uploading…' : `${url ? 'Replace' : 'Upload'} ${label.toLowerCase()}`}
        </label>
        {url && !isUploading && (
          <button type="button" onClick={() => setUrl(null)} className="text-sm text-red-600 hover:text-red-700">
            Remove
          </button>
        )}
      </div>
      {shownError && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {shownError}
        </p>
      )}
    </div>
  );
}
