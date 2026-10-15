'use client';

import { useEffect } from 'react';
import { NOTICE_COOKIE } from '@/lib/notice-cookie';

/**
 * Shows what the last action did, once. Set by a Server Action; read on the
 * next render, so it survives the page changing (e.g. "Suspend" becoming
 * "Reactivate"), then cleared.
 */
export function Notice({ message }: { message: string }) {
  useEffect(() => {
    document.cookie = `${NOTICE_COOKIE}=; Max-Age=0; path=/`;
  }, [message]);
  return (
    <p role="status" className="mb-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
      {message}
    </p>
  );
}
