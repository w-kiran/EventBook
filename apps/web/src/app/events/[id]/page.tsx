'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { formatNepalDateTime } from '@/lib/format';
import type { EventItem } from '@/types/api';

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ data: EventItem }>(`/events/${id}`)
      .then((res) => setEvent(res.data.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <p className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; All events
        </Link>
      </div>
    );
  }

  if (!event) return <p className="py-8 text-center text-gray-500">Loading event...</p>;

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        &larr; All events
      </Link>

      <div className="rounded-lg border bg-white p-6">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="mt-2 text-gray-600">{formatNepalDateTime(event.startsAt)} (Nepal time)</p>
        <p className="text-gray-600">{event.venue}</p>
        <p className="mt-4 whitespace-pre-line">{event.description}</p>

        <div className="mt-6 rounded bg-gray-50 p-4 text-sm">
          <p>
            <strong>{event.availableSeats}</strong> of {event.totalSeats} seats available
          </p>
          {event.hasStarted && <p className="mt-1 font-medium">This event has already started.</p>}
          {!event.hasStarted && event.availableSeats === 0 && <p className="mt-1 font-medium text-red-600">Sold out</p>}
        </div>

        {/* the Book button is added in T14 */}
      </div>
    </div>
  );
}