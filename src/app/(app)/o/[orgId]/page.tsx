import Link from 'next/link';
import { ProposalsGrid, type ProposalRow } from '@/components/proposals-grid';
import { formatDateTime } from '@/lib/dates';
import { finstack } from '@/lib/dal';
import { formatMoney } from '@/lib/money';

const TABS = [
  { key: 'pending', label: 'Waiting for you' },
  { key: 'all', label: 'All' },
] as const;

export default async function Inbox({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { orgId } = await params;
  const show = (await searchParams).show === 'all' ? 'all' : 'pending';
  const client = await finstack();
  const path = { params: { path: { organizationId: orgId } } };
  const [organizations, wallets, destinations, proposals, pending] = await Promise.all([
    client.GET('/v1/organizations'),
    client.GET('/v1/organizations/{organizationId}/wallets', path),
    client.GET('/v1/organizations/{organizationId}/payout-destinations', path),
    client.GET('/v1/organizations/{organizationId}/proposals', {
      params: { path: { organizationId: orgId }, query: show === 'all' ? {} : { status: 'pending' } },
    }),
    client.GET('/v1/organizations/{organizationId}/proposals', {
      params: { path: { organizationId: orgId }, query: { status: 'pending' } },
    }),
  ]);
  const organization = organizations.data?.find((org) => org.id === orgId);
  const byId = new Map((destinations.data ?? []).map((d) => [d.id, d]));

  const rows: ProposalRow[] = (proposals.data ?? []).map((p) => {
    const destination = byId.get(p.destinationId);
    const currency = destination?.currency ?? 'USD';
    return {
      id: p.id,
      status: p.status,
      summary: p.summary,
      recipient: destination
        ? `${destination.label ?? destination.accountName}${destination.kind === 'paypal' ? ' · PayPal' : ''}`
        : 'Removed destination',
      amount: formatMoney(p.amount, currency),
      amountMinor: p.amount,
      proposedBy: p.proposedByApiKeyId ? 'AI agent' : 'A teammate',
      created: formatDateTime(p.createdAt),
      createdAt: p.createdAt,
    };
  });

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-emerald-800">{organization?.name}</p>
          <h1 className="mt-1 text-2xl font-semibold">Proposals</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            Your AI agent can look things up and propose payouts. Nothing is paid until you approve it here.
          </p>
        </div>
        <div className="flex gap-3">
          {(wallets.data ?? []).map((wallet) => (
            <div key={wallet.id} className="rounded-lg bg-white px-4 py-2 ring-1 ring-zinc-200">
              <p className="text-xs text-zinc-500">{wallet.currency} available</p>
              <p className="font-semibold tabular-nums">{formatMoney(wallet.balances.available, wallet.currency)}</p>
            </div>
          ))}
        </div>
      </div>

      <nav className="mt-8 flex gap-1 border-b border-zinc-200 text-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === 'all' ? `/o/${orgId}?show=all` : `/o/${orgId}`}
            className={`-mb-px border-b-2 px-3 py-2 ${show === tab.key ? 'border-emerald-700 font-medium text-zinc-900' : 'border-transparent text-zinc-600 hover:text-zinc-900'}`}
          >
            {tab.label}
            {tab.key === 'pending' && (pending.data?.length ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-1.5 text-xs text-amber-900">{pending.data?.length}</span>
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        <ProposalsGrid organizationId={orgId} rows={rows} />
      </div>
    </section>
  );
}
