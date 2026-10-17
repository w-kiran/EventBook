'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { formatNepalDateTime } from '@/lib/format';
import type { EventItem } from '@/types/api';
import { useAppSelector } from '@/store/hooks';

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAppSelector((state) => state.auth);

  const [event, setEvent] = useState<EventItem | null>(null);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);
  const [notice, setNotice] = useState(''); // "Your seat is booked!"
  const [actionError, setActionError] = useState(''); // the booking was refused
  const [reload, setReload] = useState(0); // changing this loads the event again

  useEffect(() => {
    api
      .get<{ data: EventItem }>(`/events/${id}`)
      .then((res) => setEvent(res.data.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  async function handleBook() {
    setBooking(true);
    setNotice('');
    setActionError('');

    try {
      await api.post(`/events/${id}/bookings`);
      setNotice('Your seat is booked!');
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBooking(false);
      setReload(reload + 1); // reload so the seats and the button are correct, even after an error
    }
  }

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

  let bookingArea = null;
  if (event.viewerBooking) {
    bookingArea = (
      <p className="font-medium text-green-700">
        You have booked this event.{' '}
        <Link href="/bookings" className="text-blue-600 hover:underline">
          View my bookings
        </Link>
      </p>
    );
  } else if (event.hasStarted || event.availableSeats === 0) {
    bookingArea = null; // the message above already explains why booking is closed
  } else if (authLoading) {
    bookingArea = null;
  } else if (!user) {
    bookingArea = (
      <Link href="/login" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">
        Log in to book
      </Link>
    );
  } else {
    bookingArea = (
      <button onClick={handleBook} disabled={booking} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {booking ? 'Booking...' : 'Book my seat'}
      </button>
    );
  }

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

        <div className="mt-6 space-y-3">
          {notice && <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
          {actionError && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
          {bookingArea}
        </div>
      </div>
    </div>
  );
}