'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { formatNepalDateTime } from '@/lib/format';
import type { AttendeeItem, EventItem, PaginationInfo } from '@/types/api';
import { RequireAuth } from '@/component/RequireAuth';

function Attendees() {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [attendees, setAttendees] = useState<AttendeeItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // the event title, only used for the heading
  useEffect(() => {
    api
      .get<{ data: EventItem }>(`/events/${id}`)
      .then((res) => setTitle(res.data.data.title))
      .catch(() => setTitle(''));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setError('');

    api
      .get<{ data: AttendeeItem[]; pagination: PaginationInfo }>(`/admin/events/${id}/attendees`, {
        params: { page, pageSize: 20 },
      })
      .then((res) => {
        setAttendees(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, page]);

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-blue-600 hover:underline">
        &larr; Back to admin
      </Link>
      <h1 className="text-2xl font-bold">Attendees{title && `: ${title}`}</h1>

      {loading ? (
        <p className="py-8 text-center text-gray-500">Loading attendees...</p>
      ) : error ? (
        <p className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
      ) : attendees.length === 0 ? (
        <p className="py-8 text-center text-gray-500">No one has booked this event yet.</p>
      ) : (
        <>
          <p className="text-sm text-gray-600">{pagination?.totalItems} booked</p>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Booked on</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.bookingId} className="border-b last:border-0">
                    <td className="px-4 py-2">{a.name}</td>
                    <td className="px-4 py-2">{a.email}</td>
                    <td className="px-4 py-2">{formatNepalDateTime(a.bookedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 text-sm">
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

export default function AttendeesPage() {
  return (
    <RequireAuth admin>
      <Attendees />
    </RequireAuth>
  );
}