'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import { formatNepalDateTime } from '@/lib/format';
import type { EventItem, PaginationInfo } from '@/types/api';

export default function Home() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [search, setSearch] = useState(''); // what is typed in the box
  const [q, setQ] = useState(''); // the search that was submitted
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0); // the "Try again" button changes this to load again

  // load the events whenever the search text or the page changes
    // load the events whenever the search text or the page changes
  useEffect(() => {
    setLoading(true);
    setError('');

    api
      .get<{ data: EventItem[]; pagination: PaginationInfo }>('/events', {
        params: { page, pageSize: 9, q: q || undefined }, // axios leaves out undefined values
      })
      .then((res) => {
        setEvents(res.data.data); // res.data is the response body, and it has its own "data" field
        setPagination(res.data.pagination);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, page, reload]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setQ(search.trim());
    setPage(1); // a new search starts on page 1
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Upcoming events</h1>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
          placeholder="Search events by title"
          className="flex-1 rounded border bg-white px-3 py-2"
        />
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
          Search
        </button>
      </form>

        {loading ? (
        <p className="py-8 text-center text-gray-500">Loading events...</p>
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
          <p>{error}</p>
          <button onClick={() => setReload(reload + 1)} className="mt-2 rounded border border-red-300 px-3 py-1 text-sm">
            Try again
          </button>
        </div>
      ) : events.length === 0 ? (
        <p className="py-8 text-center text-gray-500">{q ? `No events match "${q}".` : 'No upcoming events yet.'}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`} className="block rounded-lg border bg-white p-4 shadow-sm hover:shadow-md">
                <h2 className="text-lg font-semibold">{event.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{formatNepalDateTime(event.startsAt)}</p>
                <p className="text-sm text-gray-600">{event.venue}</p>
                <p className="mt-3 text-sm">
                  {event.availableSeats === 0 ? (
                    <span className="font-medium text-red-600">Sold out</span>
                  ) : (
                    `${event.availableSeats} of ${event.totalSeats} seats available`
                  )}
                </p>
              </Link>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4 text-sm">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="rounded border bg-white px-3 py-1 disabled:opacity-40">
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="rounded border bg-white px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}