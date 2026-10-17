'use client';

import { RequireAuth } from "@/component/RequireAuth";


export default function AdminPage() {
  return (
    <RequireAuth admin>
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="mt-2 text-gray-600">Coming in a later step.</p>
    </RequireAuth>
  );
}