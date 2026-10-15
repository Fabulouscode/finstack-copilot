import { AgentChat } from '@/components/agent-chat';
import { agentConfig } from '@/lib/agent/config';
import { finstack } from '@/lib/dal';

export default async function AskPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { data: organizations } = await (await finstack()).GET('/v1/organizations');
  const organization = organizations?.find((org) => org.id === orgId);
  const settings = agentConfig();
  const unavailable = !settings.configured
    ? 'The AI agent isn’t switched on yet. Add an Anthropic API key and the agent’s FinStack key to Copilot’s settings (see the README).'
    : settings.organizationId !== orgId
      ? 'The AI agent is set up for another organization.'
      : !organization?.permissions.includes('proposals:create')
        ? 'Your role in this organization can’t ask the agent for payouts.'
        : undefined;

  return (
    <section className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-wide text-emerald-800">{organization?.name}</p>
      <h1 className="mt-1 text-2xl font-semibold">Ask the agent</h1>
      <p className="mt-1 text-sm text-zinc-600">
        It can look up your wallets, payouts and who you pay, and propose payouts. It can’t send money: every proposal waits for
        you in Proposals.
      </p>
      <div className="mt-6">
        <AgentChat organizationId={orgId} unavailable={unavailable} />
      </div>
    </section>
  );
}
