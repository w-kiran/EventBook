'use client';

import { FormEvent, useState } from 'react';
import { getErrorMessage } from '@/lib/api';
import { nepalInputToIso } from '@/lib/format';

type Props = {
  initial?: { title: string; description: string; venue: string; startsAt: string; totalSeats: number };
  submitLabel: string;
  onSubmit: (values: { title: string; description: string; venue: string; startsAt: string; totalSeats: number }) => Promise<void>;
};

export function EventForm({ initial, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [venue, setVenue] = useState(initial?.venue ?? '');
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? '');
  const [totalSeats, setTotalSeats] = useState(String(initial?.totalSeats ?? ''));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onSubmit({
        title,
        description,
        venue,
        startsAt: nepalInputToIso(startsAt),
        totalSeats: Number(totalSeats),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div>
        <label htmlFor="title" className="mb-1 block text-sm">
          Title
        </label>
        <input id="title" required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border px-3 py-2" />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm">
          Description
        </label>
        <textarea
          id="description"
          required
          rows={4}
          maxLength={5000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="venue" className="mb-1 block text-sm">
          Venue
        </label>
        <input id="venue" required minLength={2} maxLength={160} value={venue} onChange={(e) => setVenue(e.target.value)} className="w-full rounded border px-3 py-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startsAt" className="mb-1 block text-sm">
            Date and time (Nepal time)
          </label>
          <input
            id="startsAt"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="totalSeats" className="mb-1 block text-sm">
            Total seats
          </label>
          <input
            id="totalSeats"
            type="number"
            required
            min={1}
            max={100000}
            step={1}
            value={totalSeats}
            onChange={(e) => setTotalSeats(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
      </div>

      <button type="submit" disabled={submitting} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}