'use client';

import { useActionState, useState } from 'react';
import type { ActionResult } from '@/app/(app)/actions';

/**
 * A consequential action: a button that opens a form asking for a reason
 * (recorded in FinStack's audit log) and, for money, an explicit
 * acknowledgement, before anything happens.
 */
export function ConfirmForm({
  action,
  label,
  confirmLabel,
  description,
  danger,
  acknowledge,
  reasonLabel = 'Reason (recorded in the audit log)',
  reasonRequired = true,
  children,
}: {
  action: (previous: ActionResult | null, form: FormData) => Promise<ActionResult>;
  label: string;
  confirmLabel: string;
  description?: string;
  danger?: boolean;
  /** Must be ticked before confirming, e.g. for money leaving. */
  acknowledge?: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
  children?: React.ReactNode;
}) {
  const [result, run, pending] = useActionState(action, null);
  // Open from the click until the next success; errors keep it open. A
  // success shows as a notice at the top of the page.
  const [openedAt, setOpenedAt] = useState<ActionResult | null | undefined>(undefined);
  const open = openedAt !== undefined && (result === openedAt || result?.ok === false);
  const setOpen = (value: boolean) => setOpenedAt(value ? result : undefined);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`self-start rounded-md px-3 py-1.5 text-sm ring-1 ${danger ? 'text-red-800 ring-red-300 hover:bg-red-50' : 'ring-zinc-300 hover:bg-zinc-100'}`}
      >
        {label}
      </button>
    );
  }

  return (
    <form action={run} className="flex flex-col gap-3 rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
      {description && <p className="text-sm text-zinc-700">{description}</p>}
      {children}
      {(reasonRequired || reasonLabel) && (
        <label className="flex flex-col gap-1 text-sm">
          {reasonLabel}
          <textarea
            name="reason"
            required={reasonRequired}
            maxLength={500}
            rows={2}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5"
          />
        </label>
      )}
      {acknowledge && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acknowledged" required className="mt-1" />
          {acknowledge}
        </label>
      )}
      {result && !result.ok && result !== openedAt && (
        <p role="alert" className="text-xs text-red-700">{result.message}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className={`rounded-md px-3 py-1.5 text-sm text-white disabled:opacity-60 ${danger ? 'bg-red-700 hover:bg-red-800' : 'bg-zinc-900 hover:bg-zinc-800'}`}
        >
          {pending ? 'Working…' : confirmLabel}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md px-3 py-1.5 text-sm ring-1 ring-zinc-300 hover:bg-zinc-100">
          Cancel
        </button>
      </div>
    </form>
  );
}
