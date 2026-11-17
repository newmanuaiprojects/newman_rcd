import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBuildings, getFeatures } from '@/actions/rooms';
import { updateRoomAction } from '@/actions/room-form';
import { FormSection } from '@/components/FormSection';
import { RoomForm } from '@/components/RoomForm';
import { requirePermission } from '@/lib/access';
import { getRoomForEdit, getRoomHistory } from '@/lib/rooms/data';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: 'Edit room | Newman RCD',
};

const campusTime = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Chicago',
});

export default async function EditRoomPage({ params }: PageProps) {
  await requirePermission('rooms:update');
  const { id } = await params;
  const [room, history, buildings, features] = await Promise.all([
    getRoomForEdit(id),
    getRoomHistory(id),
    getBuildings(),
    getFeatures(),
  ]);
  if (!room) notFound();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <Link href={`/rooms/${id}`} className="text-gray-500 hover:text-blue-600 transition-colors mb-6 inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {room.title}
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Edit {room.title}</h1>
        <RoomForm
          action={updateRoomAction.bind(null, id)}
          buildings={buildings}
          features={features}
          initial={room.values}
          submitLabel="Save changes"
          cancelHref={`/rooms/${id}`}
        />

        <div className="mt-10">
          <FormSection id="history-heading" title="History" description="Every save made here, newest first.">
            {history.length === 0 ? (
              <p className="text-sm text-gray-600">No changes have been saved here yet.</p>
            ) : (
              <ol className="-my-3 divide-y divide-gray-100">
                {history.map((entry) => (
                  <li key={entry.id} className="py-3 text-sm text-gray-700">
                    {entry.change === 'created' ? 'Added' : 'Edited'} by {entry.editorName ?? 'a deleted account'}
                    <span className="text-gray-500">
                      {' · '}
                      <time dateTime={entry.changedAt.toISOString()}>{campusTime.format(entry.changedAt)}</time>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </FormSection>
        </div>
      </div>
    </div>
  );
}
