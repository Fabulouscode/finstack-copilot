import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { agentConfig } from '@/lib/agent/config';
import { finstackAgentApi } from '@/lib/agent/finstack-api';
import { runAgent } from '@/lib/agent/run-agent';
import { config } from '@/lib/config';
import { finstack, getSession } from '@/lib/dal';

/** The conversation comes back from the browser each turn; keep it bounded. */
const MAX_MESSAGES = 80;
const MAX_BODY_BYTES = 300_000;

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!(await getSession())) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 });

  // The person must be allowed to propose in this organization themselves.
  const { data: organizations } = await (await finstack()).GET('/v1/organizations');
  const organization = organizations?.find((org) => org.id === orgId);
  if (!organization?.permissions.includes('proposals:create')) {
    return NextResponse.json({ error: 'You can’t ask the agent for this organization.' }, { status: 403 });
  }

  const settings = agentConfig();
  if (!settings.configured) {
    return NextResponse.json(
      { error: `The AI agent isn’t configured yet (missing ${settings.missing.join(', ')}).` },
      { status: 503 },
    );
  }
  if (settings.organizationId !== orgId) {
    return NextResponse.json({ error: 'The agent is set up for another organization.' }, { status: 400 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'This conversation is too long. Start a new one.' }, { status: 413 });
  const body = JSON.parse(raw) as { messages?: Anthropic.MessageParam[] };
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: 'Send the conversation as messages.' }, { status: 400 });
  }

  try {
    const result = await runAgent({
      anthropic: new Anthropic({ apiKey: settings.anthropicApiKey }),
      model: settings.model,
      api: finstackAgentApi(config().finstackUrl, settings.apiKey),
      organizationId: orgId,
      messages,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Anthropic.APIError ? `Claude is unavailable (${error.status}).` : 'The agent hit a problem. Try again.';
    console.error('agent turn failed', error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
