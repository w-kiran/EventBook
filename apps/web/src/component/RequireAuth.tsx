'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAppSelector((state) => state.auth);
  const router = useRouter();

  // once we know nobody is logged in, go to the login page
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return <p className="py-8 text-center text-gray-500">Loading...</p>;

  if (admin && user.role !== 'ADMIN') {
    return <p className="py-8 text-center text-red-600">You do not have access to this page.</p>;
  }

  return <>{children}</>;
}