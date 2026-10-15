'use client';

import { useActionState } from 'react';
import { signIn, type SignInState } from './actions';

export function SignInForm({ expired }: { expired: boolean }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signIn,
    {},
  );
  const message =
    state.error ?? (expired ? 'Your session ended. Sign in again.' : undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      {message && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          {message}
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal focus:outline-2 focus:outline-emerald-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal focus:outline-2 focus:outline-emerald-700"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-800 px-4 py-2 font-medium text-white hover:bg-emerald-900 disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
