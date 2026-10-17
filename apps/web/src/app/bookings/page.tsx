'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import { formatNepalDateTime } from '@/lib/format';
import type { BookingItem, PaginationInfo } from '@/types/api';
import { RequireAuth } from '@/component/RequireAuth';

type Status = 'active' | 'cancelled' | 'all';

function BookingsList() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [status, setStatus] = useState<Status>('active');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // the list could not be loaded
  const [notice, setNotice] = useState(''); // "Booking cancelled."
  const [actionError, setActionError] = useState(''); // the cancel was refused
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');

    api
      .get<{ data: BookingItem[]; pagination: PaginationInfo }>('/bookings/me', {
        params: { status, page, pageSize: 10 },
      })
      .then((res) => {
        setBookings(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [status, page, reload]);

  async function handleCancel(bookingId: string) {
    if (!confirm('Cancel this booking?')) return;

    setNotice('');
    setActionError('');

    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      setNotice('Booking cancelled.');
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
    setReload(reload + 1); // reload the list either way
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">My bookings</h1>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as Status);
            setPage(1);
          }}
          className="rounded border bg-white px-3 py-2 text-sm"
        >
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
      </div>

      {notice && <p className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
      {actionError && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}

      {loading ? (
        <p className="py-8 text-center text-gray-500">Loading bookings...</p>
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
          <p>{error}</p>
          <button onClick={() => setReload(reload + 1)} className="mt-2 rounded border border-red-300 px-3 py-1 text-sm">
            Try again
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          No bookings here yet.{' '}
          <Link href="/" className="text-blue-600 hover:underline">
            Browse events
          </Link>
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
                <div>
                  <Link href={`/events/${b.event.id}`} className="text-lg font-semibold hover:underline">
                    {b.event.title}
                  </Link>
                  <p className="text-sm text-gray-600">{formatNepalDateTime(b.event.startsAt)}</p>
                  <p className="text-sm text-gray-600">{b.event.venue}</p>
                </div>

                <div className="text-sm">
                  {b.status === 'CANCELLED' ? (
                    <span className="rounded bg-gray-100 px-2 py-1 text-gray-600">Cancelled</span>
                  ) : b.canCancel ? (
                    <button onClick={() => handleCancel(b.id)} className="rounded border border-red-300 px-3 py-1 text-red-700">
                      Cancel booking
                    </button>
                  ) : (
                    <span className="text-gray-600">Event has started</span>
                  )}
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

export default function BookingsPage() {
  return (
    <RequireAuth>
      <BookingsList />
    </RequireAuth>
  );
}