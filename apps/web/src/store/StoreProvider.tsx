'use client';

import { ReactNode, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { fetchMe } from './authSlice';

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    store.dispatch(fetchMe());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}