import type { Metadata } from 'next';
import Link from 'next/link';
import { getBuildings, getFeatures } from '@/lib/rooms/queries';
import { createRoomAction } from '@/actions/room-form';
import { RoomForm } from '@/components/RoomForm';
import { requirePermission } from '@/lib/access';

export const metadata: Metadata = {
  title: 'Add a room | Newman RCD',
};

interface PageProps {
  searchParams: Promise<{ building?: string | string[] }>;
}

export default async function NewRoomPage({ searchParams }: PageProps) {
  await requirePermission('rooms:create');
  const [{ building }, buildings, features] = await Promise.all([searchParams, getBuildings(), getFeatures()]);
  const defaultBuildingId = buildings.find((row) => row.id === building)?.id;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors mb-6 inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Directory
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Add a room</h1>
        <RoomForm
          action={createRoomAction}
          buildings={buildings}
          features={features}
          defaultBuildingId={defaultBuildingId}
          addBuildingHref="/buildings/new"
          submitLabel="Add room"
          cancelHref="/"
        />
      </div>
    </div>
  );
}
