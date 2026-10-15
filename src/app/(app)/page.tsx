import Link from 'next/link';
import { redirect } from 'next/navigation';
import { finstack } from '@/lib/dal';

export default async function Organizations() {
  const { data } = await (await finstack()).GET('/v1/organizations');
  const organizations = (data ?? []).filter((org) => org.status === 'active');
  if (organizations.length === 1) redirect(`/o/${organizations[0].id}`);

  return (
    <section>
      <h1 className="text-2xl font-semibold">Your organizations</h1>
      <p className="mt-1 text-sm text-zinc-600">Choose the organization whose agent proposals you want to review.</p>
      {organizations.length === 0 ? (
        <p className="mt-6 rounded-lg bg-white p-6 text-sm text-zinc-600 ring-1 ring-zinc-200">
          You aren’t a member of any organization yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-200 rounded-lg bg-white ring-1 ring-zinc-200">
          {organizations.map((org) => (
            <li key={org.id}>
              <Link href={`/o/${org.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50">
                <span className="font-medium">{org.name}</span>
                <span className="font-mono text-xs uppercase text-zinc-500">{org.role}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
