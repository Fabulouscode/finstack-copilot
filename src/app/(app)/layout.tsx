import { cookies } from 'next/headers';
import Link from 'next/link';
import { signOut } from '@/app/login/actions';
import { Notice } from '@/components/notice';
import { requireSession } from '@/lib/dal';
import { NOTICE_COOKIE } from '@/lib/notice-cookie';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const notice = (await cookies()).get(NOTICE_COOKIE)?.value;
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="whitespace-nowrap font-semibold">
            FinStack Copilot
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden truncate text-zinc-600 sm:inline">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="whitespace-nowrap rounded-md px-2 py-1 text-zinc-600 ring-1 ring-zinc-300 hover:bg-zinc-100">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {notice && <Notice message={notice} />}
        {children}
      </main>
    </div>
  );
}
