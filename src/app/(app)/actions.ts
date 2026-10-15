'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { finstack, ForbiddenError } from '@/lib/dal';
import { NOTICE_COOKIE } from '@/lib/notice-cookie';

export type ActionResult = { ok: true } | { ok: false; message: string };

async function notice(message: string): Promise<void> {
  (await cookies()).set(NOTICE_COOKIE, message, { path: '/', maxAge: 60, sameSite: 'lax' });
}

function failure(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  const detail = (error as { detail?: string; message?: string })?.detail ?? (error as Error)?.message;
  return { ok: false, message: detail ?? 'FinStack is unavailable. Try again shortly.' };
}

/** Runs the proposal in FinStack. FinStack checks proposals:decide and that it's still pending. */
export async function approveProposal(
  organizationId: string,
  proposalId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  try {
    const note = String(form.get('reason') ?? '').trim() || undefined;
    const { data } = await (await finstack()).POST('/v1/organizations/{organizationId}/proposals/{proposalId}/approve', {
      params: { path: { organizationId, proposalId } },
      body: { note },
    });
    await notice(
      data?.status === 'executed'
        ? 'Approved. The payout is on its way.'
        : `Approved, but FinStack refused the payout: ${data?.failureReason ?? 'see details'}. Nothing was sent.`,
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/o/${organizationId}`, 'layout');
  return { ok: true };
}

export async function rejectProposal(
  organizationId: string,
  proposalId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  try {
    const note = String(form.get('reason') ?? '').trim() || undefined;
    await (await finstack()).POST('/v1/organizations/{organizationId}/proposals/{proposalId}/reject', {
      params: { path: { organizationId, proposalId } },
      body: { note },
    });
    await notice('Rejected. Nothing was sent.');
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/o/${organizationId}`, 'layout');
  return { ok: true };
}
