'use client';

import { useEffect, useState } from 'react';
import { getClientSideAuthToken } from '@/firebase';

export function useRegistryRecordDetail(open: boolean, id: string | undefined, collection: string) {
  const [state, setState] = useState<{
    key: string;
    data: Record<string, unknown> | null;
    error: string | null;
  }>({ key: '', data: null, error: null });
  const key = `${collection}:${id}`;

  useEffect(() => {
    if (!open || !id) {
      setState({ key: '', data: null, error: null });
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setState({ key, data: null, error: null });
    void (async () => {
      try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error('Session expired. Please sign in again.');
        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getRecordDetail', payload: { id, collection } }),
          cache: 'no-store',
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error || 'Could not load the complete registry record.');
        }
        if (!cancelled) setState({ key, data: result.data, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({ key, data: null, error: error instanceof Error ? error.message : 'Could not load the complete registry record.' });
        }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, id, collection, key]);

  const current = open && state.key === key;
  const data = current ? state.data : null;
  const error = current ? state.error : null;
  return { data, error, loading: Boolean(open && id && !data && !error) };
}
