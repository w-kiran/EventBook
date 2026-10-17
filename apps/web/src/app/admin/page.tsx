'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import { formatNepalDateTime } from '@/lib/format';
import type { EventItem, PaginationInfo } from '@/types/api';
import { RequireAuth } from '@/component/RequireAuth';

type Scope = 'all' | 'upcoming' | 'past';

// Only rendered for a logged-in admin, so it never calls the admin API otherwise
function AdminEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [scope, setScope] = useState<Scope>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');

    api
      .get<{ data: EventItem[]; pagination: PaginationInfo }>('/admin/events', {
        params: { scope, page, pageSize: 10 },
      })
      .then((res) => {
        setEvents(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [scope, page, reload]);

  async function handleDelete(event: EventItem) {
    if (!confirm(`Delete "${event.title}"?`)) return;

    setNotice('');
    setActionError('');

    try {
      await api.delete(`/admin/events/${event.id}`);
      setNotice('Event deleted.');
      if (events.length === 1 && page > 1) setPage(page - 1); // do not stay on an empty page
    } catch (err) {
      setActionError(getErrorMessage(err)); // for example: it still has active bookings
    }
    setReload(reload + 1);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin: events</h1>
        <div className="flex items-center gap-3">
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as Scope);
              setPage(1);
            }}
            className="rounded border bg-white px-3 py-2 text-sm"
          >
            <option value="all">All events</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
          <Link href="/admin/events/new" className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
            Create event
          </Link>
        </div>
      </div>

      {notice && <p className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
      {actionError && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}

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
        <p className="py-8 text-center text-gray-500">No events found.</p>
      ) : (
        <>
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
                <div>
                  <p className="text-lg font-semibold">
                    {event.title}
                    {event.hasStarted && <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600">Past</span>}
                  </p>
                  <p className="text-sm text-gray-600">{formatNepalDateTime(event.startsAt)}</p>
                  <p className="text-sm text-gray-600">
                    {event.bookedSeats} of {event.totalSeats} seats booked
                  </p>
                </div>

                <div className="flex gap-3 text-sm">
                  <Link href={`/admin/events/${event.id}/attendees`} className="text-blue-600 hover:underline">
                    Attendees
                  </Link>
                  {!event.hasStarted && (
                    <Link href={`/admin/events/${event.id}/edit`} className="text-blue-600 hover:underline">
                      Edit
                    </Link>
                  )}
                  <button onClick={() => handleDelete(event)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
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

export default function AdminPage() {
  return (
    <RequireAuth admin>
      <AdminEvents />
    </RequireAuth>
  );
}