import Link from 'next/link';
import { approveProposal, rejectProposal } from '@/app/(app)/actions';
import { ConfirmForm } from '@/components/confirm-form';
import { StatusPill } from '@/components/status-pill';
import { formatDateTime } from '@/lib/dates';
import { finstack } from '@/lib/dal';
import { formatMoney } from '@/lib/money';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 px-4 py-3 text-sm">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="col-span-2 break-words">{children}</dd>
    </div>
  );
}

function show(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export default async function ProposalPage({ params }: { params: Promise<{ orgId: string; proposalId: string }> }) {
  const { orgId, proposalId } = await params;
  const client = await finstack();
  const path = { params: { path: { organizationId: orgId } } };
  const [{ data: proposal }, organizations, destinations] = await Promise.all([
    client.GET('/v1/organizations/{organizationId}/proposals/{proposalId}', {
      params: { path: { organizationId: orgId, proposalId } },
    }),
    client.GET('/v1/organizations'),
    client.GET('/v1/organizations/{organizationId}/payout-destinations', path),
  ]);
  if (!proposal) return null;

  const destination = destinations.data?.find((d) => d.id === proposal.destinationId);
  const currency = destination?.currency ?? 'USD';
  const amount = formatMoney(proposal.amount, currency);
  const recipient = destination
    ? destination.kind === 'paypal'
      ? `${destination.accountName} · PayPal ${destination.email}`
      : `${destination.accountName} · ${destination.bankName ?? 'Bank'} ****${destination.accountNumberLast4}`
    : 'A destination that has since been removed';
  const canDecide = organizations.data?.find((org) => org.id === orgId)?.permissions.includes('proposals:decide');
  const payoutId = typeof proposal.result?.payoutId === 'string' ? proposal.result.payoutId : undefined;
  const payout = payoutId
    ? (await client.GET('/v1/organizations/{organizationId}/payouts/{payoutId}', {
        params: { path: { organizationId: orgId, payoutId } },
      })).data
    : undefined;
  const evidence = Object.entries(proposal.evidence ?? {});

  return (
    <article className="mx-auto max-w-3xl">
      <Link href={`/o/${orgId}`} className="text-sm text-zinc-600 hover:text-zinc-900">← Proposals</Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <StatusPill status={proposal.status} />
            <span className="text-xs text-zinc-500">
              {proposal.proposedByApiKeyId ? 'Proposed by your AI agent' : 'Proposed by a teammate'} · {formatDateTime(proposal.createdAt)}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold">{proposal.summary}</h1>
        </div>
        <p className="text-3xl font-semibold tabular-nums">{amount}</p>
      </header>

      <dl className="mt-6 divide-y divide-zinc-200 rounded-lg bg-white ring-1 ring-zinc-200">
        <Row label="To">{recipient}</Row>
        {proposal.narration && <Row label="Note to recipient">{proposal.narration}</Row>}
        <Row label="Why">
          <p className="whitespace-pre-line">{proposal.reasoning}</p>
        </Row>
        {evidence.length > 0 && (
          <Row label="What it checked">
            <ul className="space-y-1">
              {evidence.map(([key, value]) => (
                <li key={key}>
                  <span className="text-zinc-500">{key}:</span> <span className="font-mono text-xs">{show(value)}</span>
                </li>
              ))}
            </ul>
          </Row>
        )}
        {proposal.status === 'pending' && <Row label="Expires">{formatDateTime(proposal.expiresAt)}</Row>}
        {proposal.decidedAt && (
          <Row label="Decided">
            {formatDateTime(proposal.decidedAt)}
            {proposal.decisionNote && <span className="text-zinc-600"> · “{proposal.decisionNote}”</span>}
          </Row>
        )}
        {proposal.failureReason && <Row label="Why it failed">{proposal.failureReason}</Row>}
        {payout && (
          <Row label="Payout">
            <span className="flex items-center gap-2">
              <StatusPill status={payout.status} />
              <span className="font-mono text-xs">{payout.reference}</span>
              {payout.providerReference && <span className="text-xs text-zinc-500">· {payout.provider} {payout.providerReference}</span>}
            </span>
          </Row>
        )}
      </dl>

      {proposal.status === 'pending' && canDecide && (
        <div className="mt-6 flex flex-wrap items-start gap-3">
          <ConfirmForm
            action={approveProposal.bind(null, orgId, proposalId)}
            label={`Approve and pay ${amount}`}
            confirmLabel={`Pay ${amount}`}
            description="FinStack sends this payout once, through the usual checks (balance, limits, fees)."
            acknowledge={`I’ve checked this, and want ${amount} sent to ${destination?.accountName ?? 'this destination'}.`}
            reasonLabel="Note (optional, kept with the decision)"
            reasonRequired={false}
          />
          <ConfirmForm
            action={rejectProposal.bind(null, orgId, proposalId)}
            label="Reject"
            confirmLabel="Reject"
            danger
            description="Nothing is sent. The agent can see that you rejected it and why."
            reasonLabel="Why? (optional, the agent can read it)"
            reasonRequired={false}
          />
        </div>
      )}
      {proposal.status === 'pending' && !canDecide && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          An owner or admin of this organization needs to approve or reject this.
        </p>
      )}
    </article>
  );
}
