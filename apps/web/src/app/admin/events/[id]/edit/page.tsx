'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { toNepalInputValue } from '@/lib/format';
import type { EventItem } from '@/types/api';
import { EventForm } from '@/component/EventForm';
import { RequireAuth } from '@/component/RequireAuth';

function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ data: EventItem }>(`/events/${id}`)
      .then((res) => setEvent(res.data.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  const backLink = (
    <Link href="/admin" className="text-sm text-blue-600 hover:underline">
      &larr; Back to admin
    </Link>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {backLink}
        <p className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
      </div>
    );
  }

  if (!event) return <p className="py-8 text-center text-gray-500">Loading event...</p>;

  if (event.hasStarted) {
    return (
      <div className="space-y-4">
        {backLink}
        <p>This event has already started and cannot be edited.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {backLink}
      <h1 className="text-2xl font-bold">Edit event</h1>
      <p className="text-sm text-gray-600">{event.bookedSeats} seats are booked, so total seats cannot go below that.</p>

      <EventForm
        initial={{
          title: event.title,
          description: event.description,
          venue: event.venue,
          startsAt: toNepalInputValue(event.startsAt),
          totalSeats: event.totalSeats,
        }}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await api.patch(`/admin/events/${id}`, values);
          router.push('/admin');
        }}
      />
    </div>
  );
}

export default function EditEventPage() {
  return (
    <RequireAuth admin>
      <EditEvent />
    </RequireAuth>
  );
}