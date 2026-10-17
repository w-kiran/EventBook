'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { RequireAuth } from '@/component/RequireAuth';
import { EventForm } from '@/component/EventForm';

export default function NewEventPage() {
  const router = useRouter();

  return (
    <RequireAuth admin>
      <div className="space-y-4">
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          &larr; Back to admin
        </Link>
        <h1 className="text-2xl font-bold">Create event</h1>

        <EventForm
          submitLabel="Create event"
          onSubmit={async (values) => {
            await api.post('/admin/events', values);
            router.push('/admin');
          }}
        />
      </div>
    </RequireAuth>
  );
}