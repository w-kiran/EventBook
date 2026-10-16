'use client';

import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';

export function Navbar() {
  const { user, loading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          EventBook
        </Link>

        <div className="flex flex-1 flex-wrap items-center gap-4 text-sm">
          {user && <Link href="/bookings">My bookings</Link>}
          {/* This link is only a convenience. The real protection is in the backend. */}
          {user?.role === 'ADMIN' && <Link href="/admin">Admin</Link>}
        </div>

        <div className="flex items-center gap-3 text-sm">
          {loading ? null : user ? (
            <>
              <span>{user.name}</span>
              <button onClick={() => dispatch(logout())} className="rounded border px-3 py-1">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/register" className="rounded bg-blue-600 px-3 py-1 text-white">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}