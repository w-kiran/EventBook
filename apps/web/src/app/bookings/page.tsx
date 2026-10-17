'use client';

import { RequireAuth } from "@/component/RequireAuth";


export default function BookingsPage() {
  return (
    <RequireAuth>
      <h1 className="text-2xl font-bold">My bookings</h1>
      <p className="mt-2 text-gray-600">Coming in the next step.</p>
    </RequireAuth>
  );
}