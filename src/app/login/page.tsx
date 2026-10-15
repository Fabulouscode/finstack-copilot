import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/dal';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = { title: 'Sign in · FinStack Copilot' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  if (await getSession()) redirect('/');
  const { expired } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <p className="font-mono text-xs uppercase tracking-wide text-emerald-800">
          FinStack Copilot
        </p>
        <h1 className="mb-1 mt-1 text-2xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-zinc-600">Approve what your AI agent proposes.</p>
        <SignInForm expired={expired === '1'} />
      </div>
    </main>
  );
}
